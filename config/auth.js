const jwt = require("jsonwebtoken");

const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ error: "Token de acceso requerido" });
  }

  if (!process.env.JWT_SECRET) {
      console.error("❌ ERROR CRÍTICO: JWT_SECRET no está configurado en las variables de entorno.");
      return res.status(500).json({ error: "Error interno del servidor: configuración de seguridad faltante." });
  }

  try {
    // Usamos directamente process.env.JWT_SECRET. ¡No hay fallback hardcodeado!
    const decoded = jwt.verify(token, process.env.JWT_SECRET); 
    req.usuario = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Token inválido" });
  }
};

const verificarRol = (roles) => {
  // ... (tu código para verificarRol, no necesita cambios directos relacionados con process.env aquí) ...
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: "Acceso denegado. Rol insuficiente." });
    }

    next();
  };
};

module.exports = {
  verificarToken,
  verificarRol
};