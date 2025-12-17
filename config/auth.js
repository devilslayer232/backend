const jwt = require("jsonwebtoken");

const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ error: "Token de acceso requerido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "mi_secreto_super_seguro");
    req.usuario = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Token inválido" });
  }
};

const verificarRol = (roles) => {
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


