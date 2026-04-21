// routes/hotspotRoutes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/hotspotController');
const auth    = require('../middleware/authMiddleware');

// Ruta pública: el visor 3D necesita leer hotspots sin login
router.get('/',    ctrl.list);
router.get('/:id', ctrl.getOne);

// Rutas protegidas: solo el admin puede crear/editar/borrar
router.post('/',             auth, ctrl.create);
router.put('/:id',           auth, ctrl.update);
router.patch('/:id/toggle',  auth, ctrl.toggle);
router.delete('/:id',        auth, ctrl.remove);

module.exports = router;
