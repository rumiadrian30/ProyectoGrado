const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const ctrl   = require('../controllers/settingsController');

router.get('/role-limits',              auth, ctrl.getRoleLimits);
router.put('/role-limits/:role',        auth, ctrl.updateRoleLimit);

router.get('/config',                   auth, ctrl.getAllConfig);
router.put('/config/:key',              auth, ctrl.updateConfig);
router.post('/config/:key/reset',       auth, ctrl.resetConfig);

module.exports = router;
