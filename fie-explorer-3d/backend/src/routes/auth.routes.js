const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.post('/login',  ctrl.login);
router.get('/me',     requireAuth, ctrl.me);
router.post('/logout', requireAuth, ctrl.logout);

module.exports = router;
