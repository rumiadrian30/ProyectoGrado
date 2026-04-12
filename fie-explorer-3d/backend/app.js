const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const compression= require('compression');

const app = express();

// ── Seguridad y parseo ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// ── Logging ─────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Health check ────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:  'ok',
    service: 'fie-explorer-3d-backend',
    time:    new Date().toISOString(),
    env:     process.env.NODE_ENV || 'development',
  });
});

// ── Rutas API ────────────────────────────────────────────────
// Sprint 0: rutas mínimas para verificar que el servicio levanta
app.get('/api', (_req, res) => {
  res.json({
    message: 'FIE Explorer 3D API v1.0',
    docs:    '/api/docs',
    health:  '/health',
  });
});

// TODO Sprint 2+: registrar rutas reales
// const hotspotsRouter = require('./src/routes/hotspots.routes');
// app.use('/api/hotspots', hotspotsRouter);

// ── 404 handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ── Error handler global ─────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[FIE Backend Error]', err.message);
  res.status(err.status || 500).json({
    error:   err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;
