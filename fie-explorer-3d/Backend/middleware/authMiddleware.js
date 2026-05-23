// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  const token =
    req.cookies?.token ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    console.warn(
      `[AUTH] Acceso sin token → ${req.ip} → ${req.originalUrl}`
    )

    return res.status(401).json({
      error: 'No autenticado. Token requerido.'
    })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.admin = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    next();

  } catch (err) {

    console.warn(
      `[AUTH] Token expirado o inválido → ${req.ip} → ${req.originalUrl}`
    )

    return res.status(401).json({
      error: 'Token inválido o expirado.'
    })
  }
};

module.exports.optional = function authOptional(req, res, next) {
  const token =
    req.cookies?.token ||
    req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);

      req.admin = {
        id: payload.userId,
        email: payload.email,
        role: payload.role
      };

    } catch {

      console.warn(
        `[AUTH] Token expirado o inválido → ${req.ip} → ${req.originalUrl}`
      )
    }
  }

  next();
};