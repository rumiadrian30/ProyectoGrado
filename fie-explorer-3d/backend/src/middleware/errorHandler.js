const logger = require('../utils/logger');
const { query } = require('../config/database');

/**
 * Middleware central de manejo de errores.
 * Registra el error en error_logs y devuelve una respuesta JSON limpia.
 */
const errorHandler = async (err, req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.isOperational ? err.message : 'Error interno del servidor';
  const severity = statusCode >= 500 ? 'ERROR' : 'WARN';

  logger.error('Error capturado por errorHandler', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Persistir en error_logs (best-effort)
  try {
    await query(
      `INSERT INTO error_logs
         (error_code, error_message, stack_trace, context, severity, endpoint, method, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        String(statusCode),
        err.message,
        err.stack,
        JSON.stringify({ params: req.params, query: req.query }),
        severity,
        req.originalUrl,
        req.method,
        req.ip,
      ]
    );
  } catch (_dbErr) {
    // No lanzar otro error si falla la escritura en BD
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/** Crea un error operacional con código HTTP */
const createError = (message, statusCode = 500) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
};

module.exports = { errorHandler, createError };
