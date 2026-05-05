// routes/buildingRoutes.js
const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const ctrl   = require('../controllers/buildingController');

// ── Públicas: el visor 3D necesita leer edificios sin login ──
router.get('/',     ctrl.list);
router.get('/:id',  ctrl.list);

// ── Protegidas: solo admin puede crear/editar/borrar ─────────
router.post('/',             auth, ctrl.create);
router.put('/:id',           auth, ctrl.update);
router.patch('/:id/toggle',  auth, ctrl.toggle);
router.delete('/:id',        auth, ctrl.remove);

module.exports = router;
