const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { ejecutarQuery } = require('../config/database');

// Configuración de multer para subir archivos (temporal)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const clienteId = req.params.clienteId;
    const uniqueName = `${clienteId}_temp.jpg`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
}).single('foto');

// Middleware para manejar multipart/form-data
const uploadMiddleware = (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'Error en la subida del archivo: ' + err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// Endpoint para subir foto del pedido (soporta base64 y multipart)
router.post('/:clienteId', uploadMiddleware, async (req, res) => {
  try {
    const { clienteId } = req.params;
    console.log('Iniciando subida de foto para cliente:', clienteId);

    let imageBuffer;

    if (req.body.image) {
      // Si viene base64 en JSON
      console.log('Procesando imagen base64');
      const base64Data = req.body.image.replace(/^data:image\/[a-z]+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      // Si viene como multipart/form-data
      console.log('Procesando imagen multipart');
      if (!req.file) {
        console.log('No se encontró req.file');
        return res.status(400).json({ error: 'No se proporcionó imagen' });
      }
      console.log('Archivo recibido:', req.file.originalname, 'tamaño:', req.file.size);
      imageBuffer = fs.readFileSync(req.file.path);
    }

    // Procesar imagen con Sharp (redimensionar y optimizar)
    const uniqueName = `${clienteId}.jpg`;
    const outputPath = path.join(__dirname, '../fotos', uniqueName);
    console.log('Ruta de salida:', outputPath);

    // Asegurar que el directorio existe
    const dir = path.dirname(outputPath);
    console.log('Directorio:', dir);
    if (!fs.existsSync(dir)) {
      console.log('Creando directorio...');
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log('Directorio creado exitosamente');
      } catch (mkdirError) {
        console.error('Error creando directorio:', mkdirError);
        throw new Error('No se pudo crear el directorio de fotos');
      }
    }

    console.log('Procesando imagen con Sharp...');
    await sharp(imageBuffer)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(outputPath);

    // Verificar que el archivo se creó correctamente
    if (!fs.existsSync(outputPath)) {
      console.log('Archivo no se creó correctamente');
      throw new Error('Error al guardar el archivo procesado');
    }
    console.log('Archivo creado exitosamente en:', outputPath);

    // Eliminar archivo temporal si vino de multipart
    if (req.file && fs.existsSync(req.file.path)) {
      console.log('Eliminando archivo temporal');
      fs.unlinkSync(req.file.path);
    }

    // Guardar ruta relativa en base de datos
    const rutaRelativa = `fotos/${uniqueName}`;
    console.log('Actualizando DB con ruta:', rutaRelativa);
    await ejecutarQuery(
      'UPDATE clientes SET foto_id = ? WHERE id = ?',
      [rutaRelativa, clienteId]
    );

    console.log('Foto subida correctamente');
    res.json({
      mensaje: 'Foto subida correctamente',
      ruta: rutaRelativa,
      clienteId: parseInt(clienteId)
    });

  } catch (error) {
    console.error('Error subiendo foto:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
  }
});

// Endpoint para obtener foto del pedido
router.get('/:clienteId', (req, res) => {
  const { clienteId } = req.params;

  ejecutarQuery('SELECT foto_id FROM clientes WHERE id = ?', [clienteId])
    .then(results => {
      if (results.length === 0 || !results[0].foto_id) {
        return res.status(404).json({ error: 'Foto no encontrada' });
      }

      const rutaFoto = path.join(__dirname, '..', results[0].foto_id);
      if (fs.existsSync(rutaFoto)) {
        res.sendFile(rutaFoto);
      } else {
        res.status(404).json({ error: 'Archivo no encontrado' });
      }
    })
    .catch(error => {
      console.error('Error obteniendo foto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    });
});

// Endpoint para eliminar foto del pedido
router.delete('/:clienteId', (req, res) => {
  const { clienteId } = req.params;

  ejecutarQuery('SELECT foto_id FROM clientes WHERE id = ?', [clienteId])
    .then(results => {
      if (results.length === 0 || !results[0].foto_id) {
        return res.status(404).json({ error: 'Foto no encontrada' });
      }

      const rutaFoto = path.join(__dirname, '..', results[0].foto_id);
      if (fs.existsSync(rutaFoto)) {
        fs.unlinkSync(rutaFoto);
      }

      return ejecutarQuery('UPDATE clientes SET foto_id = NULL WHERE id = ?', [clienteId]);
    })
    .then(() => {
      res.json({ mensaje: 'Foto eliminada correctamente' });
    })
    .catch(error => {
      console.error('Error eliminando foto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    });
});

module.exports = router;
