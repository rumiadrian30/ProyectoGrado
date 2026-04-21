const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const ctrl   = require('../controllers/modelController');

// Ruta pública: el visor 3D necesita leer modelos sin login
router.get('/', ctrl.list);

// Rutas protegidas: solo el admin puede crear/editar/borrar
router.post('/',      auth, ctrl.create);
router.put('/:id',    auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
