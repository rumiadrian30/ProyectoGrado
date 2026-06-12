// Backend/middleware/uploadMiddleware.js
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Carpeta destino de los modelos GLB/GLTF.
// Prioridad: variable de entorno MODELS_DIR → carpeta local uploads/models/
const MODELS_DIR = process.env.MODELS_DIR
  ? process.env.MODELS_DIR          // ya es absoluta, no envolver en path.resolve
  : path.resolve(__dirname, '../uploads/models');
  
// Crear carpeta si no existe
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MODELS_DIR),

  filename: (_req, file, cb) => {
    // 1. Limpiar nombre: minúsculas, espacios → guiones, quitar caracteres especiales
    const ext   = path.extname(file.originalname).toLowerCase();
    const base  = path.basename(file.originalname, path.extname(file.originalname))
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-_]/g, '');

    // 2. Siempre agregar timestamp → nombre único garantizado, sin colisiones,
    //    sin necesidad de verificar existencia en disco ni renombrar después.
    //    Ejemplo: "doritos_1778907637845.glb"
    const uniqueName = `${base}_${Date.now()}${ext}`;
    cb(null, uniqueName);
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