const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const rateLimit = require('express-rate-limit');
const { db } = require("../config/database");

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many login attempts from this IP, please try again later.'
});

// Login: busca usuario por email y password
router.post("/", loginLimiter, (req, res) => {
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
        process.env.JWT_SECRET ,
        { expiresIn: "365d" }
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

// Verificar token desde Authorization header
router.get("/verify", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({
      valid: true,
      usuario: decoded
    });
  } catch (error) {
    res.status(401).json({ error: "Token inválido" });
  }
});

module.exports = router;