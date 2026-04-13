const router = require('express').Router();
const ctrl = require('../controllers/models.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.get('/',   ctrl.getAll);
router.post('/',  requireAuth, ctrl.create);

module.exports = router;
