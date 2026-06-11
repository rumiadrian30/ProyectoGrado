// Backend/routes/imageRoutes.js
const router = require('express').Router();
const path   = require('path');
const auth   = require('../middleware/authMiddleware');
const ctrl   = require('../controllers/imageController');
const { uploadImage, IMAGES_DIR } = require('../middleware/uploadImageMiddleware');

// ── CRUD de registros (URL manual) ───────────────────────────
router.get('/hotspot/:hotspotId', auth, ctrl.listByHotspot);
router.post('/',      auth, ctrl.create);
router.put('/:id',    auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

// ── Upload de archivo de imagen ──────────────────────────────
router.post('/upload', auth, (req, res, next) => {
  uploadImage.single('image')(req, res, (err) => {
    if (err) {
      // multer arroja errores con código LIMIT_FILE_SIZE cuando excede el límite
      if (err.code === 'LIMIT_FILE_SIZE') {
        const e = new Error('El archivo supera el tamaño máximo permitido (5 MB).');
        e.status = 400;
        return next(e);
      }
      // fileFilter rechazó el formato
      const e = new Error(err.message);
      e.status = 400;
      return next(e);
    }

    if (!req.file) {
      const e = new Error('No se recibió ningún archivo.');
      e.status = 400;
      return next(e);
    }

    const fileUrl = `/hotspot-images/${req.file.filename}`;
    console.log(`  \x1b[33m[IMAGE UPLOAD]\x1b[0m ✅ ${req.file.filename} → ${IMAGES_DIR}`);

    res.json({
      url:      fileUrl,
      filename: req.file.filename,
      size_kb:  Math.round(req.file.size / 1024),
    });
  });
});

// ── Servir archivos subidos ───────────────────────────────────
router.get('/file/:filename', (req, res, next) => {
  const filename = path.basename(req.params.filename);
  const absPath  = path.resolve(IMAGES_DIR, filename);
  res.sendFile(absPath, { root: '/' }, err => {
    if (err) {
      const e = new Error('Imagen no encontrada.');
      e.status = 404;
      next(e);
    }
  });
});

module.exports = router;