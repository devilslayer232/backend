const express = require("express");
const router = express.Router();
const { db } = require("../config/database");

// Listar todos los pedidos con cliente
router.get("/", (req, res) => {
  const select = req.isPublic
    ? "SELECT id, nombre, pedido, foto_id FROM clientes ORDER BY id DESC"
    : "SELECT id, nombre, direccion, contacto, pedido, foto_id FROM clientes ORDER BY id DESC";
  db.query(select.replace(/foto_pedido/g, 'foto_id'), (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Obtener pedido por cliente id
router.get("/:id", (req, res) => {
  db.query(
    "SELECT id, nombre, pedido, foto_id FROM clientes WHERE id = ?",
    [req.params.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ error: "No encontrado" });
      res.json(results[0]);
    }
  );
});

// Proteger métodos que no sean GET en la ruta pública
router.put("/:id", (req, res) => {
  if (req.isPublic) return res.status(401).json({ error: "No autorizado" });

  const { pedido, foto_id } = req.body; // <-- incluir foto_id opcional
  const query = "UPDATE clientes SET pedido = ?, foto_id = ? WHERE id = ?";

  db.query(query, [pedido, foto_id || null, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: req.params.id, pedido, foto_id: foto_id || null });
  });
});

// Eliminar pedido del cliente (poner vacío)
router.delete("/:id", (req, res) => {
  if (req.isPublic) return res.status(401).json({ error: "No autorizado" });
  db.query("DELETE FROM clientes WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: req.params.id, eliminado: true });
  });
});

module.exports = router;
