// backend/funcionamiento/clientes.js
const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { verificarToken, verificarRol } = require("../config/auth");

// -------------------------
// Crear nuevo cliente
// -------------------------
router.post('/', async (req, res) => {
  const { nombre, direccion, contacto, pedido, fotoId } = req.body;

  // Validamos campos obligatorios excepto fotoId
  if (!nombre || !direccion || !contacto || !pedido) {
    return res.status(400).json({
      mensaje: "Todos los campos (excepto foto) son obligatorios"
    });
  }

  try {
    db.query(
      'INSERT INTO clientes (nombre, direccion, contacto, pedido, foto_id) VALUES (?, ?, ?, ?, ?)',
      [nombre, direccion, contacto, pedido, fotoId || null],
      (err, result) => {
        if (err) {
          console.error('Error al crear cliente:', err);
          return res.status(500).json({
            mensaje: "Error al crear el cliente"
          });
        }

        res.status(201).json({
          id: result.insertId,
          nombre,
          direccion,
          contacto,
          pedido,
          fotoId: fotoId || null
        });
      }
    );
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      mensaje: "Error interno del servidor"
    });
  }
});

// -------------------------
// Obtener todos los clientes
// -------------------------
router.get("/", (req, res) => {
  db.query(`
    SELECT c.*, u.email as transportista_email
    FROM clientes c
    LEFT JOIN usuarios u ON c.transportista_id = u.id
  `, (err, results) => {
    if (err) {
      return res.status(500).json({
        mensaje: "Error al obtener los clientes",
      });
    }
    res.json(results);
  });
});

// -------------------------
// Actualizar estado del cliente (solo avance irreversible a 'entregado')
// -------------------------
router.put("/:id/estado", (req, res) => {
  console.log("🔧 PUT /api/clientes/:id/estado - Versión actualizada");
  const clienteId = req.params.id;
  const { estado } = req.body || {};

  // Solo permitimos marcar como 'entregado'
  if (estado !== "entregado") {
    return res.status(400).json({ error: "Transición de estado no permitida" });
  }

  // Verificar estado actual
  db.query("SELECT estado FROM clientes WHERE id = ?", [clienteId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results || results.length === 0) return res.status(404).json({ error: "Cliente no encontrado" });

    const estadoActual = results[0].estado;
    if (estadoActual === "entregado") {
      // Ya entregado, idempotente: responder 200 para no generar errores en UI
      return res.json({ id: Number(clienteId), estado: "entregado", yaEntregado: true });
    }

    db.query(
      "UPDATE clientes SET estado = 'entregado' WHERE id = ?",
      [clienteId],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        res.json({ id: Number(clienteId), estado: "entregado" });
      }
    );
  });
});

// -------------------------
// Asignar transportista a un cliente
// -------------------------
router.put("/:id/transportista", verificarToken, (req, res) => {
  const clienteId = req.params.id;
  const { transportista_id } = req.body;

  if (transportista_id === undefined) {
    return res.status(400).json({ error: "transportista_id es requerido" });
  }

  db.query(
    "UPDATE clientes SET transportista_id = ? WHERE id = ?",
    [transportista_id, clienteId],
    (err, result) => {
      if (err) {
        console.error('Error al asignar transportista:', err);
        return res.status(500).json({ error: "Error al asignar transportista" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }
      res.json({ message: "Transportista asignado correctamente" });
    }
  );
});

// -------------------------
// Eliminar un cliente
// -------------------------
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM clientes WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(204).end();
  });
});

module.exports = router;
