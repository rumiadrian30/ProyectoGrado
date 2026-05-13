// middleware/authMiddleware.js
// Verifica el token JWT en cada ruta protegida (/admin/*)
const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  // Leer token desde cookie HttpOnly o cabecera Authorization
  const token =
    req.cookies?.token ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No autenticado. Token requerido.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Inyectar datos del admin en el request para los controllers
    req.admin = {
      id:    payload.userId,
      email: payload.email,
      role:  payload.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

module.exports.optional = function authOptional(req, res, next) {
  const token =
    req.cookies?.token ||
    req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.admin = { id: payload.userId, email: payload.email, role: payload.role };
    } catch {
      // token inválido → se ignora, req.admin queda undefined
    }
  }
  next();
};