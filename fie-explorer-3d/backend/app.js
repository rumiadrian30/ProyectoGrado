const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./src/config/env');
const { testConnection } = require('./src/config/database');
const { errorHandler } = require('./src/middleware/errorHandler');
const logger = require('./src/utils/logger');

// Rutas
const authRoutes      = require('./src/routes/auth.routes');
const buildingRoutes  = require('./src/routes/buildings.routes');
const hotspotRoutes   = require('./src/routes/hotspots.routes');
const modelRoutes     = require('./src/routes/models.routes');

const app = express();

// ─── Seguridad ──────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate limiting ──────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas peticiones. Intenta más tarde.' },
});
app.use('/api/', limiter);

// ─── Parsers ────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging HTTP ───────────────────────────────────────────────
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

// ─── Rutas API ──────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/hotspots',  hotspotRoutes);
app.use('/api/models',    modelRoutes);

// ─── 404 ────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// ─── Error handler central ──────────────────────────────────────
app.use(errorHandler);

// ─── Arranque ───────────────────────────────────────────────────
const start = async () => {
  try {
    await testConnection();
    app.listen(env.PORT, () => {
      logger.info(`🚀 FIE Explorer 3D API corriendo en http://localhost:${env.PORT}`);
      logger.info(`   Entorno : ${env.NODE_ENV}`);
      logger.info(`   CORS    : ${env.FRONTEND_URL}`);
    });
  } catch (err) {
    logger.error('Error al iniciar el servidor', { error: err.message });
    process.exit(1);
  }
};

start();

module.exports = app;
