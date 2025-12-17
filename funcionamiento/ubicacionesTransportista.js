const express = require("express");
const router = express.Router();
const { db, ejecutarQuery } = require("../config/database");

// POST - Guardar ubicación del transportista
router.post("/", async (req, res) => {
  try {
    const { transportista_id, latitud, longitud, velocidad, direccion } = req.body;

    if (!transportista_id || latitud === undefined || longitud === undefined) {
      return res.status(400).json({ error: "Faltan campos requeridos: transportista_id, latitud, longitud" });
    }

    const sql = `
      INSERT INTO ubicaciones_transportista (transportista_id, latitud, longitud, velocidad, direccion, timestamp)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;

    const result = await ejecutarQuery(sql, [transportista_id, latitud, longitud, velocidad || 0, direccion || '']);

    res.status(201).json({
      mensaje: "Ubicación guardada exitosamente",
      id: result.insertId
    });
  } catch (error) {
    console.error("Error guardando ubicación:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET - Obtener historial de ubicaciones de un transportista
router.get("/historial/:transportista_id", async (req, res) => {
  try {
    const { transportista_id } = req.params;
    const { limite = 50 } = req.query;

    const sql = `
      SELECT id, transportista_id, latitud, longitud, velocidad, direccion, timestamp
      FROM ubicaciones_transportista
      WHERE transportista_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    const results = await ejecutarQuery(sql, [transportista_id, parseInt(limite)]);
    res.json(results);
  } catch (error) {
    console.error("Error obteniendo historial de ubicaciones:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET - Obtener última ubicación de un transportista
router.get("/ultima/:transportista_id", async (req, res) => {
  try {
    const { transportista_id } = req.params;

    const sql = `
      SELECT id, transportista_id, latitud, longitud, velocidad, direccion, timestamp
      FROM ubicaciones_transportista
      WHERE transportista_id = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    const results = await ejecutarQuery(sql, [transportista_id]);

    if (results.length === 0) {
      return res.status(404).json({ error: "No se encontró ubicación para este transportista" });
    }

    res.json(results[0]);
  } catch (error) {
    console.error("Error obteniendo última ubicación:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET - Obtener ubicaciones recientes de todos los transportistas (para admin)
router.get("/recientes", async (req, res) => {
  try {
    const { limite = 100 } = req.query;

    const sql = `
      SELECT ut.*, t.email as transportista_email
      FROM ubicaciones_transportista ut
      JOIN transportistas t ON ut.transportista_id = t.id
      ORDER BY ut.timestamp DESC
      LIMIT ?
    `;

    const results = await ejecutarQuery(sql, [parseInt(limite)]);
    res.json(results);
  } catch (error) {
    console.error("Error obteniendo ubicaciones recientes:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
