const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { createError } = require('./errorHandler');

/**
 * Verifica el JWT enviado en el header Authorization: Bearer <token>
 * Adjunta el payload decodificado en req.admin
 */
const requireAuth = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError('Token de autenticación requerido', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(createError('Token expirado', 401));
    }
    return next(createError('Token inválido', 401));
  }
};

/**
 * Solo permite acceso a superadmins
 */
const requireSuperAdmin = (req, _res, next) => {
  if (req.admin?.role !== 'superadmin') {
    return next(createError('Acceso restringido a superadministradores', 403));
  }
  next();
};

module.exports = { requireAuth, requireSuperAdmin };
