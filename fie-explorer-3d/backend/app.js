const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');

const env            = require('./src/config/env');
const { testConnection } = require('./src/config/database');
const { errorHandler }   = require('./src/middleware/errorHandler');
const logger             = require('./src/utils/logger');

// Rutas — solo lectura pública
const buildingRoutes = require('./src/routes/buildings.routes');
const hotspotRoutes  = require('./src/routes/hotspots.routes');
const modelRoutes    = require('./src/routes/models.routes');

const app = express();

// ─── Seguridad ──────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: env.FRONTEND_URL,
  methods: ['GET', 'OPTIONS'],           // solo lectura
  allowedHeaders: ['Content-Type'],
}));

// ─── Rate limiting ──────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas peticiones. Intenta más tarde.' },
}));

// ─── Parsers y logging ──────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// ─── Health check ───────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'fie-explorer-3d-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Rutas API (públicas, solo lectura) ─────────────────────────
app.use('/api/buildings', buildingRoutes);
app.use('/api/hotspots',  hotspotRoutes);
app.use('/api/models',    modelRoutes);

// ─── 404 y error central ────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});
app.use(errorHandler);

// ─── Arranque ───────────────────────────────────────────────────
const start = async () => {
  try {
    await testConnection();
    app.listen(env.PORT, () => {
      logger.info(`🚀 FIE Explorer 3D API → http://localhost:${env.PORT}`);
      logger.info(`   Entorno : ${env.NODE_ENV}`);
      logger.info(`   CORS    : ${env.FRONTEND_URL}`);
      logger.info(`   Nota    : API de solo lectura — escritura en fie-admin`);
    });
  } catch (err) {
    logger.error('Error al iniciar el servidor', { error: err.message });
    process.exit(1);
  }
};

start();
module.exports = app;
