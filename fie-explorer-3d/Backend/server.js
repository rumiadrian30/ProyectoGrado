require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');

// ── Swagger ──────────────────────────────────────────────────
const { swaggerUi, swaggerSpec, swaggerUiOptions } = require('./swagger');

const authRoutes       = require('./routes/authRoutes');
const hotspotRoutes    = require('./routes/hotspotRoutes');
const auditRoutes      = require('./routes/auditRoutes');
const errorRoutes      = require('./routes/errorRoutes');
const encryptionRoutes = require('./routes/encryptionRoutes');
const buildingRoutes   = require('./routes/buildingRoutes');
const modelRoutes      = require('./routes/modelRoutes');
const imageRoutes      = require('./routes/imageRoutes');
const adminUserRoutes  = require('./routes/adminUserRoutes');
const settingsRoutes   = require('./routes/settingsRoutes');
const { errorMiddleware } = require('./middleware/errorMiddleware');

const app  = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// ── Seguridad: Helmet (HT-10) ────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      styleSrc:       ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      imgSrc:         ["'self'", 'data:', 'cdn.jsdelivr.net'],
      fontSrc:        ["'self'", 'cdn.jsdelivr.net'],
      connectSrc:     ["'self'"],
      frameSrc:       ["'none'"],
      objectSrc:      ["'none'"],
      upgradeInsecureRequests: isProd ? [] : null,
    },
  },
  strictTransportSecurity: isProd
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  frameguard:      { action: 'deny' },
  noSniff:         true,
  xssFilter:       true,
  referrerPolicy:  { policy: 'no-referrer' },
  permissionsPolicy: false,
  crossOriginOpenerPolicy:   { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

// Permissions-Policy manual
app.use((_req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
  );
  next();
});

// ── Rate limiting ────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta en 15 minutos.' },
});
app.use('/api/', globalLimiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de login desde esta IP. Intenta en 15 minutos.' },
});
app.use('/api/auth/login', loginLimiter);

// ── CORS ─────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.ADMIN_FRONTEND_URL  || 'http://localhost:5173',
    process.env.PUBLIC_FRONTEND_URL || 'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'null',
  ],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Logger de requests ───────────────────────────────────────
const MC = { GET:'\x1b[36m', POST:'\x1b[32m', PUT:'\x1b[33m', PATCH:'\x1b[35m', DELETE:'\x1b[31m' };
const R = '\x1b[0m', D = '\x1b[2m', B = '\x1b[1m';

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms    = Date.now() - start;
    const col   = MC[req.method] || '\x1b[37m';
    const sc    = res.statusCode;
    const scCol = sc >= 500 ? '\x1b[31m' : sc >= 400 ? '\x1b[33m' : '\x1b[32m';
    const usr   = req.admin?.email ? ` ${D}[${req.admin.email}]${R}` : '';
    console.log(`  ${col}${B}${req.method.padEnd(6)}${R} ${req.path.padEnd(42)} ${scCol}${sc}${R} ${D}${ms}ms${usr}${R}`);
  });
  next();
});

// ── Swagger UI (/api/docs) — HT-08 ──────────────────────────
if (!isProd || process.env.SWAGGER_ENABLED === 'true') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

// ── Rutas ────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/hotspots',    hotspotRoutes);
app.use('/api/audit-logs',  auditRoutes);
app.use('/api/error-logs',  errorRoutes);
app.use('/api/encryption',  encryptionRoutes);
app.use('/api/buildings',   buildingRoutes);
app.use('/api/models',      modelRoutes);
app.use('/api/images',      imageRoutes);
app.use('/api/admin-users', adminUserRoutes);
app.use('/api/settings',    settingsRoutes);

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', project: 'FIE Explorer 3D', timestamp: new Date().toISOString() });
});

// Ruta raíz — redirige a la documentación
app.get('/', (_, res) => {
  res.json({
    project: 'FIE Explorer 3D — API REST',
    version: '1.0.0',
    docs: '/api/docs',
    health: '/api/health',
  });
});

app.use((req, _, next) => {
  const err = new Error(`Ruta no encontrada: ${req.method} ${req.path}`);
  err.status = 404; next(err);
});
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log('');
  console.log(`${B}\x1b[34m╔════════════════════════════════════════╗${R}`);
  console.log(`${B}\x1b[34m║   FIE Explorer 3D — API REST · ESPOCH  ║${R}`);
  console.log(`${B}\x1b[34m║   http://localhost:${PORT}               ║${R}`);
  console.log(`${B}\x1b[34m║   Docs → http://localhost:${PORT}/api/docs ║${R}`);
  console.log(`${B}\x1b[34m╚════════════════════════════════════════╝${R}`);
  console.log('');
});
module.exports = app;
