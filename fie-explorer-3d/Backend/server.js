/**
 * Backend/server.js — GeoESPOCH 3D
 */

require('dotenv').config();

const path = require('path');
const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const fs           = require('fs');

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
const { MODELS_DIR } = require('./middleware/uploadMiddleware');
const { IMAGES_DIR } = require('./middleware/uploadImageMiddleware');
const { getClient }  = require('./utils/redisClient');
const { clientLogger } = require('./middleware/clientLogger.js');

const app  = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';
app.set('trust proxy', 1);

app.use(clientLogger);

// ── Helmet ──────────────────────────────────────────────────────────────────
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

app.use((_req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
  );
  next();
});

// ── Rate limiting ───────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500,
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
  message: { error: 'Demasiados intentos de login. Intenta en 15 minutos.' },
});

app.use('/api/auth/login', loginLimiter);

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'https://proyecto-grado-p3v5.vercel.app',
  process.env.ADMIN_FRONTEND_URL,
  process.env.PUBLIC_FRONTEND_URL,
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : []),
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    const isAllowed =
      allowedOrigins.includes(origin) ||
      /^https:\/\/.*\.vercel\.app$/.test(origin);

    if (isAllowed) {
      return callback(null, true);
    }

    return callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Client-App',
  ],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Logger de requests ──────────────────────────────────────────────────────
const MC = {
  GET: '\x1b[36m',
  POST: '\x1b[32m',
  PUT: '\x1b[33m',
  PATCH: '\x1b[35m',
  DELETE: '\x1b[31m',
};

const R = '\x1b[0m';
const D = '\x1b[2m';
const B = '\x1b[1m';

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const ms    = Date.now() - start;
    const col   = MC[req.method] || '\x1b[37m';
    const sc    = res.statusCode;
    const scCol = sc >= 500 ? '\x1b[31m' : sc >= 400 ? '\x1b[33m' : '\x1b[32m';
    const usr   = req.admin?.email ? ` ${D}[${req.admin.email}]${R}` : '';

    console.log(
      `  ${col}${B}${req.method.padEnd(6)}${R} ${req.path.padEnd(42)} ${scCol}${sc}${R} ${D}${ms}ms${usr}${R}`
    );
  });

  next();
});

// ── Swagger ─────────────────────────────────────────────────────────────────
if (!isProd || process.env.SWAGGER_ENABLED === 'true') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

// ── Ruta explícita para mapa-espoch.glb ─────────────────────────────────────
app.get('/models/mapa-espoch.glb', (req, res, next) => {
  const filePath = path.resolve(MODELS_DIR, 'mapa-espoch.glb');

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: 'mapa-espoch.glb no encontrado',
      path: filePath,
      modelsDir: MODELS_DIR,
    });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  res.sendFile(filePath, (err) => {
    if (err) next(err);
  });
});

// ── Ruta estática para imágenes de hotspot ───────────────────────────────────
app.use('/hotspot-images', express.static(IMAGES_DIR, {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=3600');
  },
}));

// ── Ruta estática genérica para modelos ─────────────────────────────────────
app.use('/models', express.static(MODELS_DIR, {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    if (filePath.endsWith('.glb')) {
      res.setHeader('Content-Type', 'model/gltf-binary');
    }

    if (filePath.endsWith('.gltf')) {
      res.setHeader('Content-Type', 'model/gltf+json');
    }
  },
}));

// ── Rutas de la API ─────────────────────────────────────────────────────────
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

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    project: 'GeoESPOCH 3D',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (_req, res) => {
  res.json({
    project: 'Explorador 3D FIE — API REST · ESPOCH',
    version: '2.0.0',
    docs:    '/api/docs',
    health:  '/api/health',
    campus:  '/models/mapa-espoch.glb',
  });
});

// ── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  const err = new Error(`Ruta no encontrada: ${req.method} ${req.path}`);
  err.status = 404;
  next(err);
});

app.use(errorMiddleware);

// ── Arranque ────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log('');
  console.log(`${B}\x1b[34m╔════════════════════════════════════════════╗${R}`);
  console.log(`${B}\x1b[34m║   Explorador 3D FIE — API REST · ESPOCH   ║${R}`);
  console.log(`${B}\x1b[34m║   http://localhost:${PORT}                 ║${R}`);
  console.log(`${B}\x1b[34m║   Docs   → http://localhost:${PORT}/api/docs ║${R}`);
  console.log(`${B}\x1b[34m║   Campus → http://localhost:${PORT}/models/mapa-espoch.glb ║${R}`);
  console.log(`${B}\x1b[34m╚════════════════════════════════════════════╝${R}`);
  console.log('');

  const campusGlb = path.join(MODELS_DIR, 'mapa-espoch.glb');

  console.log(`  ${D}MODELS_DIR:${R} ${MODELS_DIR}`);
  console.log(`  ${D}Campus GLB:${R} ${campusGlb}`);

  if (fs.existsSync(campusGlb)) {
    const stat = fs.statSync(campusGlb);
    console.log(
      `  \x1b[32m✔\x1b[0m  mapa-espoch.glb encontrado (${(stat.size / 1024 / 1024).toFixed(1)} MB)`
    );
  } else {
    console.warn(`  \x1b[33m⚠\x1b[0m  mapa-espoch.glb NO encontrado en: ${campusGlb}`);
    console.warn(`  \x1b[33m⚠\x1b[0m  Cópialo ahí antes de usar el visor 3D.`);
  }

  const redis = getClient();

  if (redis) {
    try {
      await redis.ping();
      console.log(`  \x1b[36m[Redis]\x1b[0m \x1b[32m Conectado\x1b[0m → ${process.env.REDIS_URL}`);
    } catch (err) {
      console.warn(`  \x1b[33m[Redis]\x1b[0m \x1b[31m✗ No disponible\x1b[0m — ${err.message}`);
    }
  }

  console.log('');
});

module.exports = app;