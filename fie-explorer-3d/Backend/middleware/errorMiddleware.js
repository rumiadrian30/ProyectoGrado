// middleware/errorMiddleware.js
// Captura errores y los guarda en error_logs con cifrado AES-256 (pgcrypto)
// =========================================================================
// Campos cifrados en error_logs:
//   ip_encrypted      → pgp_sym_encrypt(ip_address,   ENCRYPTION_KEY)
//   message_encrypted → pgp_sym_encrypt(error_message, ENCRYPTION_KEY)
// El campo ip_address plano queda NULL; error_message muestra '[CIFRADO]'
// para evidenciar que el dato sensible solo existe en la columna BYTEA.
// =========================================================================
const pool = require('../db/pool');

const ENC_KEY = () => process.env.DB_ENCRYPTION_KEY || 'fie_secret_key_2026_AES256';

// Helper reutilizable exportado para usarse desde cualquier controlador
async function logError({
  error_code, error_message, stack_trace, context,
  severity = 'ERROR', endpoint, method, user_id, ip_address,
}) {
  try {
    const ip  = ip_address || 'unknown';
    const msg = error_message || 'Error desconocido';

    await pool.query(
      `INSERT INTO error_logs
         (error_code, error_message, stack_trace, context,
          severity, endpoint, method, user_id,
          ip_address,
          ip_encrypted, message_encrypted)
       VALUES
         ($1, '[CIFRADO]', $2, $3,
          $4, $5, $6, $7,
          NULL,
          pgp_sym_encrypt($8::text, $9::text),
          pgp_sym_encrypt($10::text, $9::text))`,
      [
        error_code,
        stack_trace || null,
        context ? JSON.stringify(context) : null,
        severity,
        endpoint || null,
        method   || null,
        user_id  || null,
        ip,
        ENC_KEY(),
        msg,
      ]
    );
  } catch (dbErr) {
    console.error('⚠  No se pudo guardar el error en error_logs:', dbErr.message);
  }
}

// Middleware Express de 4 parámetros (siempre al final del servidor)
function errorMiddleware(err, req, res, next) {
  const status     = err.status || err.statusCode || 500;
  const severity   = status >= 500 ? 'ERROR' : 'WARN';
  const ip_address = req.ip || req.connection?.remoteAddress || null;
  const user_id    = req.admin?.id || null;

  const context = {
    params: req.params,
    query:  req.query,
    body: req.body && !req.body.password && !req.body.password_hash
      ? req.body
      : { _sanitized: true },
  };

  logError({
    error_code:    String(status),
    error_message: err.message || 'Error interno del servidor',
    stack_trace:   process.env.NODE_ENV === 'development' ? err.stack : undefined,
    context,
    severity,
    endpoint:  req.path,
    method:    req.method,
    user_id,
    ip_address,
  });

  console.error(`[${severity}] ${req.method} ${req.path} → ${err.message}`);

  res.status(status).json({
    error:  err.message || 'Error interno del servidor',
    status,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = { errorMiddleware, logError };
