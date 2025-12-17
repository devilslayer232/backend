const express = require("express");
const router = express.Router();
const { db } = require("../config/database");

// Ejemplo: obtener todas las rutas (debes tener una tabla rutas)
router.get("/", (req, res) => {
  db.query("SELECT * FROM rutas", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;