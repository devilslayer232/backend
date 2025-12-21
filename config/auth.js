const jwt = require("jsonwebtoken");

const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ error: "Token de acceso requerido" });
  }

  try {
    // Usamos JWT_SECRET con fallback para compatibilidad
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "732ac7f71614373114b24f6412a69e1e466e6bb82002c48e95ff93e39dbb4c3b");
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