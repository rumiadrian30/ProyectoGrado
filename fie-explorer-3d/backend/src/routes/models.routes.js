const router = require('express').Router();
const ctrl   = require('../controllers/models.controller');

// Solo lectura — escritura es responsabilidad de fie-admin
router.get('/', ctrl.getAll);

module.exports = router;
