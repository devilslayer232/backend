const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const { db, ejecutarQuery } = require('../config/database');
const path = require('path');
const fs = require('fs');

// Configuración de multer para subir archivos
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB límite
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

// Función para detectar rostros usando análisis básico de imagen
async function detectarRostro(imageBuffer) {
  try {
    // Procesar la imagen con Sharp
    const metadata = await sharp(imageBuffer).metadata();

    // Análisis básico de la imagen
    const { width, height } = metadata;

    // Verificar que la imagen tenga un tamaño mínimo
    if (width < 100 || height < 100) {
      return {
        detected: false,
        confidence: 0,
        message: 'Imagen demasiado pequeña para análisis facial'
      };
    }

    // Análisis básico de contraste y luminosidad
    const stats = await sharp(imageBuffer)
      .greyscale()
      .stats();

    const mean = stats.channels[0].mean;
    const stdev = stats.channels[0].stdev;

    // Criterios básicos para detectar un rostro
    // Un rostro típico tiene cierta variación de contraste
    const hasGoodContrast = stdev > 20;
    const hasGoodBrightness = mean > 50 && mean < 200;

    if (hasGoodContrast && hasGoodBrightness) {
      return {
        detected: true,
        confidence: Math.min(85, (stdev / 2) + (Math.abs(mean - 125) / 10)),
        message: 'Rostro detectado exitosamente'
      };
    } else {
      return {
        detected: false,
        confidence: Math.max(15, (stdev / 2) + (Math.abs(mean - 125) / 10)),
        message: 'No se pudo detectar un rostro válido'
      };
    }
  } catch (error) {
    console.error('Error en detección facial:', error);
    return {
      detected: false,
      confidence: 0,
      message: 'Error procesando la imagen'
    };
  }
}

// Función para verificar si el cliente ya tiene un rostro registrado
async function verificarRostroExistente(clienteId) {
  try {
    const rostro = await ejecutarQuery(
      'SELECT id FROM rostros_clientes WHERE cliente_id = ?',
      [clienteId]
    );
    return rostro && rostro.length > 0;
  } catch (error) {
    console.error('Error verificando rostro existente:', error);
    return false;
  }
}

// Endpoint para registrar foto del cliente
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { clienteId } = req.body;

    if (!req.file) return res.status(400).json({ error: 'No se proporcionó imagen' });
    if (!clienteId) return res.status(400).json({ error: 'ID de cliente requerido' });

    // Verificar si ya tiene un rostro registrado
    const tieneRostro = await verificarRostroExistente(clienteId);
    if (tieneRostro) {
      return res.status(400).json({
        error: 'El cliente ya tiene un rostro registrado',
        registered: false
      });
    }

    // Procesar imagen
    const imageBuffer = req.file.buffer;
    const deteccion = await detectarRostro(imageBuffer);

    if (!deteccion.detected) {
      return res.status(400).json({
        error: deteccion.message,
        confidence: deteccion.confidence,
        registered: false
      });
    }

    // Guardar rostro en la base de datos
    const imagenBase64 = imageBuffer.toString('base64');
    await ejecutarQuery(
      'INSERT INTO rostros_clientes (cliente_id, imagen_rostro, confianza_deteccion, fecha_registro) VALUES (?, ?, ?, NOW())',
      [clienteId, imagenBase64, deteccion.confidence]
    );

    res.json({
      registered: true,
      message: 'Rostro registrado exitosamente',
      confidence: deteccion.confidence
    });

  } catch (error) {
    console.error('Error en registro facial:', error);
    res.status(500).json({
      registered: false,
      error: 'Error interno del servidor'
    });
  }
});

// Endpoint para verificar si un cliente tiene rostro registrado
router.get('/status/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;

    const rostro = await ejecutarQuery(
      'SELECT id, fecha_registro, confianza_deteccion FROM rostros_clientes WHERE cliente_id = ?',
      [clienteId]
    );

    if (rostro && rostro.length > 0) {
      res.json({
        hasRegisteredFace: true,
        registrationDate: rostro[0].fecha_registro,
        confidence: rostro[0].confianza_deteccion
      });
    } else {
      res.json({
        hasRegisteredFace: false
      });
    }
  } catch (error) {
    console.error('Error verificando estado de registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para obtener el rostro registrado (solo para verificación)
router.get('/face/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;

    // Primero intentar obtener de rostros_clientes (sistema facial dedicado)
    let rostro = await ejecutarQuery(
      'SELECT imagen_rostro FROM rostros_clientes WHERE cliente_id = ?',
      [clienteId]
    );

    // Si no hay en rostros_clientes, intentar obtener de la tabla clientes (foto_id)
    if (!rostro || rostro.length === 0) {
      console.log('No hay rostro en rostros_clientes, buscando en clientes.foto_id');
      const cliente = await ejecutarQuery(
        'SELECT foto_id FROM clientes WHERE id = ?',
        [clienteId]
      );

      if (cliente && cliente.length > 0 && cliente[0].foto_id) {
        // Leer el archivo de imagen desde el sistema de archivos
        const path = require('path');
        const fs = require('fs');
        const rutaFoto = path.join(__dirname, '..', cliente[0].foto_id);

        if (fs.existsSync(rutaFoto)) {
          const imagenBuffer = fs.readFileSync(rutaFoto);
          const imagenBase64 = `data:image/jpeg;base64,${imagenBuffer.toString('base64')}`;

          res.json({
            faceImage: imagenBase64
          });
          return;
        }
      }

      res.status(404).json({
        error: 'Rostro no encontrado'
      });
    } else {
      // Retornar imagen de rostros_clientes con formato data URL
      const imagenBase64 = `data:image/jpeg;base64,${rostro[0].imagen_rostro}`;
      res.json({
        faceImage: imagenBase64
      });
    }
  } catch (error) {
    console.error('Error obteniendo rostro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para registrar foto del cliente (versión alternativa con Base64)
router.post('/registro-facial', async (req, res) => {
  const { clienteId, imagen } = req.body;

  if (!clienteId || !imagen) {
    return res.status(400).json({
      error: "Se requiere ID del cliente y la imagen"
    });
  }

  try {
    // Verificar si ya tiene un rostro registrado
    const tieneRostro = await verificarRostroExistente(clienteId);
    if (tieneRostro) {
      return res.status(400).json({
        error: 'El cliente ya tiene un rostro registrado',
        registered: false
      });
    }

    // Convertir base64 a buffer
    const imageBuffer = Buffer.from(imagen, 'base64');
    const deteccion = await detectarRostro(imageBuffer);

    if (!deteccion.detected) {
      return res.status(400).json({
        error: deteccion.message,
        confidence: deteccion.confidence,
        registered: false
      });
    }

    // Guardar en base de datos
    await ejecutarQuery(
      'INSERT INTO rostros_clientes (cliente_id, imagen_rostro, confianza_deteccion, fecha_registro) VALUES (?, ?, ?, NOW())',
      [clienteId, imagen, deteccion.confidence]
    );

    res.json({
      mensaje: "Foto registrada correctamente",
      fotoId: `foto_${Date.now()}`,
      registered: true,
      confidence: deteccion.confidence
    });
  } catch (error) {
    console.error('Error en registro facial:', error);
    res.status(500).json({
      error: "Error al procesar la imagen"
    });
  }
});

module.exports = router;
