// routes/authRoutes.js
const express = require('express');
const router  = express.Router();
const { login, logout, me } = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');

router.post('/login',  login);
router.post('/logout', auth, logout);  // Requiere JWT para registrar LOGOUT
router.get('/me',      auth, me);

module.exports = router;
