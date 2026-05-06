// Backend/middleware/uploadMiddleware.js
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Carpeta destino: Public Frontend/public/models/
// Configurable con MODELS_DIR en .env
const MODELS_DIR = process.env.MODELS_DIR ||
  path.resolve(__dirname, '../../../Public Frontend/public/models');

// Crear carpeta si no existe
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MODELS_DIR),

  filename: (_req, file, cb) => {
    // Limpiar nombre: espacios → guiones, quitar caracteres raros
    const clean = file.originalname
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9.\-_]/g, '');

    // Evitar colisiones: prefijo timestamp si ya existe
    const dest = path.join(MODELS_DIR, clean);
    if (fs.existsSync(dest)) {
      const ext  = path.extname(clean);
      const base = path.basename(clean, ext);
      cb(null, `${base}_${Date.now()}${ext}`);
    } else {
      cb(null, clean);
    }
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['.glb', '.gltf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Formato no permitido: ${ext}. Solo se aceptan .glb y .gltf`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB máx
});

module.exports = { upload, MODELS_DIR };
