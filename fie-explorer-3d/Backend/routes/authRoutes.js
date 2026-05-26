// routes/authRoutes.js
const express = require('express');
const router  = express.Router();
const { login, logout, me, refresh } = require('../controllers/authController'); 
const auth = require('../middleware/authMiddleware');

router.post('/login',   login);
router.post('/logout',  auth, logout);
router.post('/refresh', auth, refresh);  
router.get('/me',       auth, me);

module.exports = router;