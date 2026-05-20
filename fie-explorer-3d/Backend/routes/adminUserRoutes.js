const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const ctrl   = require('../controllers/adminUserController');

// ── Middleware exclusivo superadmin ─────────────────────────
function superadminOnly(req, res, next) {
  if (req.admin?.role !== 'superadmin') {
    return res.status(403).json({ error: 'Acceso restringido a superadministradores.' });
  }
  next();
}

router.get('/',                        auth,                 ctrl.list);
router.post('/',                       auth, superadminOnly, ctrl.create);
router.patch('/:id/toggle',            auth, superadminOnly, ctrl.toggleActive);
router.patch('/:id/reset-password',    auth, superadminOnly, ctrl.resetPassword);

// Eliminación física — solo superadmin
router.delete('/:id',                  auth, superadminOnly, ctrl.remove);

module.exports = router;