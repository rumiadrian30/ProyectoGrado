/**
 * clientLogger.js
 */

const LABELS = {
  admin:  '\x1b[35m[ADMIN] \x1b[0m',   // magenta
  public: '\x1b[36m[PUBLIC]\x1b[0m',   // cyan
};

function clientLogger(req, res, next) {
  res.on('finish', () => {
    const client = req.headers['x-client-app'] || 'unknown';
    const label  = LABELS[client]
      ?? `\x1b[33m[${client.toUpperCase()}]\x1b[0m`;

    const statusColor = res.statusCode < 400 ? '\x1b[32m' : '\x1b[31m';
    const user        = req.user?.email ?? '-';
    const ms          = Date.now() - req._startTime;

    console.log(
      `${label}  ${req.method.padEnd(6)} ${req.path.padEnd(42)}` +
      `${statusColor}${res.statusCode}\x1b[0m  ${ms}ms  (${user})`
    );
  });

  req._startTime = Date.now();
  next();
}

module.exports = { clientLogger };