// Backend/routes/modelRoutes.js
const router = require('express').Router();
const path   = require('path');
const auth   = require('../middleware/authMiddleware');
const authOptional = auth.optional;
const ctrl   = require('../controllers/modelController');
const { upload, MODELS_DIR } = require('../middleware/uploadMiddleware');
const { optimizeGlbFile }    = require('../utils/glbOptimizer');

// ── Pública: el visor 3D lee modelos sin login ────────────────
router.get('/', authOptional, ctrl.list);

// ── Upload de archivo .glb / .gltf ───────────────────────────
// Tras recibir el archivo se optimiza para web (texturas WebP, geometría
// comprimida con meshopt). Ver utils/glbOptimizer.js. Si la optimización
// falla, el archivo original se conserva tal cual y se registra el aviso.
router.post('/upload', auth, upload.single('model'), async (req, res, next) => {
  if (!req.file) {
    const e = new Error('No se recibió ningún archivo.'); e.status = 400; return next(e);
  }

  const originalSizeMB = parseFloat((req.file.size / (1024 * 1024)).toFixed(2));
  const filePath       = `/models/${req.file.filename}`;

  console.log(`  \x1b[36m[UPLOAD]\x1b[0m ✅ ${req.file.filename} (${originalSizeMB} MB) → ${MODELS_DIR}`);

  let fileSizeMB = originalSizeMB;
  let optimized  = null;

  if (process.env.GLB_OPTIMIZE !== 'false') {
    try {
      const result = await optimizeGlbFile(req.file.path, {
        log: (m) => console.log(`  \x1b[36m[OPTIMIZE]\x1b[0m${m}`),
      });

      if (!result.skipped) {
        fileSizeMB = result.after.sizeMb;
        optimized  = {
          original_size_mb: result.before.sizeMb,
          triangles:        result.after.triangles,
          textures:         result.after.textures,
          reduction_pct:    Math.round((1 - result.after.sizeMb / result.before.sizeMb) * 100),
        };
      }
    } catch (err) {
      console.warn(`  \x1b[33m[OPTIMIZE]\x1b[0m ⚠ ${req.file.filename}: ${err.message} — se conserva el original`);
    }
  }

  res.json({
    file_path:      filePath,
    filename:       req.file.filename,
    file_size_mb:   fileSizeMB,
    format:         path.extname(req.file.filename).replace('.', '').toUpperCase(),
    triangle_count: optimized?.triangles ?? null,
    optimized,
  });
});

// ── Servir archivo GLB para preview en el admin ───────────────
// res.sendFile requiere ruta absoluta; path.resolve la garantiza.
router.get('/file/:filename', authOptional, (req, res, next) => {
  const filename = path.basename(req.params.filename); // evitar path traversal
  const absPath  = path.resolve(MODELS_DIR, filename); // siempre absoluta
  res.sendFile(absPath, { root: '/' }, err => {
    if (err) {
      const e = new Error('Archivo de modelo no encontrado.'); e.status = 404; next(e);
    }
  });
});

// ── Protegidas: CRUD de registros ─────────────────────────────
router.post('/',      auth, ctrl.create);
router.put('/:id',    auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
