// Backend/routes/modelRoutes.js
const router = require('express').Router();
const path   = require('path');
const auth   = require('../middleware/authMiddleware');
const authOptional = auth.optional;
const ctrl   = require('../controllers/modelController');
const { upload, MODELS_DIR } = require('../middleware/uploadMiddleware');

// ── Pública: el visor 3D lee modelos sin login ────────────────
router.get('/', authOptional, ctrl.list); 

// ── Upload de archivo .glb / .gltf ───────────────────────────
router.post('/upload', auth, upload.single('model'), (req, res, next) => {
  if (!req.file) {
    const e = new Error('No se recibió ningún archivo.'); e.status = 400; return next(e);
  }

  const fileSizeMB  = parseFloat((req.file.size / (1024 * 1024)).toFixed(2));
  const filePath    = `/models/${req.file.filename}`;

  console.log(`  \x1b[36m[UPLOAD]\x1b[0m ✅ ${req.file.filename} (${fileSizeMB} MB) → ${MODELS_DIR}`);

  res.json({
    file_path:    filePath,
    filename:     req.file.filename,
    file_size_mb: fileSizeMB,
    format:       path.extname(req.file.filename).replace('.', '').toUpperCase(),
  });
});

// ── Protegidas: CRUD de registros ─────────────────────────────
router.post('/',      auth, ctrl.create);
router.put('/:id',    auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
