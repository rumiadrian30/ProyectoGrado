const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const ctrl   = require('../controllers/buildingController');

// Rutas públicas: el visor 3D necesita leer edificios sin login
router.get('/',     ctrl.list);
router.get('/:id',  ctrl.list);

// Ruta protegida: solo el admin puede editar
router.put('/:id',  auth, ctrl.update);

module.exports = router;
