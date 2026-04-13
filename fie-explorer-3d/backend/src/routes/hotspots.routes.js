const router = require('express').Router();
const ctrl = require('../controllers/hotspots.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.get('/',       ctrl.getAll);
router.get('/:id',   ctrl.getById);
router.post('/',     requireAuth, ctrl.create);
router.put('/:id',   requireAuth, ctrl.update);
router.delete('/:id',requireAuth, ctrl.remove);

module.exports = router;
