// Backend/middleware/uploadImageMiddleware.js
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const IMAGES_DIR = process.env.IMAGES_DIR
  ? process.env.IMAGES_DIR
  : path.resolve(__dirname, '../uploads/images');

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXT  = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const MAX_SIZE_MB  = 5;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, IMAGES_DIR),

  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, path.extname(file.originalname))
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-_]/g, '');
    cb(null, `${base || 'imagen'}_${Date.now()}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXT.includes(ext) && ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Formato no permitido: ${ext}. Solo se aceptan ${ALLOWED_EXT.join(', ')}`), false);
  }
};

const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
});

module.exports = { uploadImage, IMAGES_DIR, MAX_SIZE_MB, ALLOWED_EXT };