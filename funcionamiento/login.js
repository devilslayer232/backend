const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { db } = require("../config/database");

// Login: busca usuario por email y password
router.post("/", (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña son requeridos" });
  }

  db.query(
    "SELECT id, email, password, rol FROM usuarios WHERE email = ?",
    [email],
    (err, results) => {
      if (err) {
        console.error("Error en consulta de login:", err);
        return res.status(500).json({ error: "Error interno del servidor" });
      }
      
      if (results.length === 0) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }

      const usuario = results[0];
      
      // Comparar contraseña
      if (usuario.password !== password) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }

      // Crear token JWT
      const token = jwt.sign(
        { 
          id: usuario.id, 
          email: usuario.email, 
          rol: usuario.rol 
        },
        process.env.JWT_SECRET || "mi_secreto_super_seguro",
        { expiresIn: "24h" }
      );

      res.json({ 
        mensaje: "Login exitoso", 
        usuario: {
          id: usuario.id,
          email: usuario.email,
          rol: usuario.rol
        },
        token: token
      });
    }
  );
});

// Verificar token
router.get("/verify", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "mi_secreto_super_seguro");
    res.json({ 
      valid: true, 
      usuario: decoded 
    });
  } catch (error) {
    res.status(401).json({ error: "Token inválido" });
  }
});

module.exports = router;