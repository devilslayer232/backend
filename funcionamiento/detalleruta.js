const express = require("express");
const router = express.Router();
const { db } = require("../config/database");

// Puedes adaptar esto según tu lógica de rutas
router.get("/", (req, res) => {
  db.query("SELECT id, nombre, direccion, contacto, pedido FROM clientes", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;