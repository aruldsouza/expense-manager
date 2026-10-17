const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validate');

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', authMiddleware, getMe);

module.exports = router;
