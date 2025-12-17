
const express = require("express");
const router = express.Router();
const { db, ejecutarQuery } = require("../config/database");

// GET - Obtener todos los registros
router.get("/", async (req, res) => {
  try {
    const results = await ejecutarQuery(`SELECT * FROM ${config.table} ORDER BY created_at DESC`);
    res.json(results);
  } catch (error) {
    console.error("Error obteniendo clientes:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET - Obtener un registro por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const results = await ejecutarQuery(`SELECT * FROM ${config.table} WHERE id = ?`, [id]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }
    
    res.json(results[0]);
  } catch (error) {
    console.error("Error obteniendo clientes por ID:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST - Crear nuevo registro
router.post("/", async (req, res) => {
  try {
    const campos = Object.keys(req.body);
    const valores = Object.values(req.body);
    
    const placeholders = campos.map(() => '?').join(', ');
    const sql = `INSERT INTO ${config.table} (${campos.join(', ')}) VALUES (${placeholders})`;
    
    const result = await ejecutarQuery(sql, valores);
    res.status(201).json({ 
      mensaje: "Registro creado exitosamente", 
      id: result.insertId 
    });
  } catch (error) {
    console.error("Error creando clientes:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// PUT - Actualizar registro
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const campos = Object.keys(req.body);
    const valores = Object.values(req.body);
    
    const setClause = campos.map(campo => `${campo} = ?`).join(', ');
    const sql = `UPDATE ${config.table} SET ${setClause} WHERE id = ?`;
    
    await ejecutarQuery(sql, [...valores, id]);
    res.json({ mensaje: "Registro actualizado exitosamente" });
  } catch (error) {
    console.error("Error actualizando clientes:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// DELETE - Eliminar registro
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await ejecutarQuery(`DELETE FROM ${config.table} WHERE id = ?`, [id]);
    res.json({ mensaje: "Registro eliminado exitosamente" });
  } catch (error) {
    console.error("Error eliminando clientes:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
