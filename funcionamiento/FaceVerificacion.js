// backend/funcionamiento/FaceVerificacion.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const { ejecutarQuery } = require('../config/database');

// Configuración de multer para subir archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten archivos de imagen'), false);
  }
});

// Función para detectar rostros usando análisis básico de imagen
async function detectarRostro(imageBuffer) {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const { width, height } = metadata;
    if (width < 100 || height < 100) 
      return { detected: false, confidence: 0, message: 'Imagen demasiado pequeña' };

    const stats = await sharp(imageBuffer).greyscale().stats();
    const mean = stats.channels[0].mean;
    const stdev = stats.channels[0].stdev;
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
        message: 'Rostro no válido' 
      };
    }
  } catch (error) {
    console.error('Error detección facial:', error);
    return { detected: false, confidence: 0, message: 'Error procesando la imagen' };
  }
}

// Endpoint para registrar/verificar rostro de cliente
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { clienteId } = req.body;

    if (!req.file) return res.status(400).json({ error: 'No se proporcionó imagen' });
    if (!clienteId) return res.status(400).json({ error: 'ID de cliente requerido' });

    // Procesar imagen
    const imageBuffer = req.file.buffer;
    const deteccion = await detectarRostro(imageBuffer);

    if (!deteccion.detected) {
      return res.status(400).json({ error: deteccion.message, confidence: deteccion.confidence });
    }

    // Guardar rostro en la base de datos
    const imagenBase64 = imageBuffer.toString('base64');
    const result = await ejecutarQuery(
      'INSERT INTO rostros_clientes (cliente_id, imagen_rostro, confianza_deteccion) VALUES (?, ?, ?)',
      [clienteId, imagenBase64, deteccion.confidence]
    );

    res.json({
      fotoId: result.insertId,
      message: 'Rostro registrado exitosamente',
      confidence: Math.round(deteccion.confidence)
    });
  } catch (error) {
    console.error('Error en registro facial:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para verificar rostro de cliente (comparación) - ahora recibe datos desde frontend
router.post('/verificar', async (req, res) => {
  try {
    const { clienteId, verified, confidence } = req.body;
    console.log('Registrando verificación facial para cliente:', clienteId);

    if (!clienteId) {
      return res.status(400).json({ error: 'ID de cliente requerido' });
    }

    // Registrar verificación en la base de datos
    await ejecutarQuery(
      'INSERT INTO verificaciones_faciales (cliente_id, transportista_id, confianza, resultado, fecha_verificacion) VALUES (?, ?, ?, ?, NOW())',
      [clienteId, 1, confidence || 0, verified ? 'exitoso' : 'fallido']
    );

    console.log('Verificación registrada exitosamente');
    res.json({
      success: true,
      message: 'Verificación registrada correctamente'
    });

  } catch (error) {
    console.error('Error registrando verificación:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
});

// Endpoint para obtener historial de verificaciones de un cliente
router.get('/historial/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;

    const verificaciones = await ejecutarQuery(
      `SELECT vf.*, c.nombre as cliente_nombre, u.email as transportista_email
       FROM verificaciones_faciales vf
       JOIN clientes c ON vf.cliente_id = c.id
       JOIN usuarios u ON vf.transportista_id = u.id
       WHERE vf.cliente_id = ?
       ORDER BY vf.fecha_verificacion DESC
       LIMIT 10`,
      [clienteId]
    );

    res.json(verificaciones);
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
