const router = require('express').Router();
const ctrl   = require('../controllers/buildings.controller');

// Solo lectura — escritura es responsabilidad de fie-admin
router.get('/',     ctrl.getAll);
router.get('/:id',  ctrl.getById);

module.exports = router;
