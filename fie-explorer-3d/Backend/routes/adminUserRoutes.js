const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const ctrl   = require('../controllers/adminUserController');
router.get('/',                   auth, ctrl.list);
router.post('/',                  auth, ctrl.create);
router.patch('/:id/toggle',       auth, ctrl.toggleActive);
router.patch('/:id/reset-password', auth, ctrl.resetPassword);
module.exports = router;
