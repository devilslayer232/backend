const express = require("express");
const router = express.Router();
const { db } = require("../config/database");

// GET - Obtener todos los transportistas
router.get("/", (req, res) => {
  db.query("SELECT id, email FROM usuarios WHERE rol = 'transportista'", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

module.exports = router;
