const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    getCurrentUser,
    searchUsers
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

// Public auth routes — protected by authLimiter (10 req / 15 min)
router.post('/register', authLimiter, registerValidation, registerUser);
router.post('/login', authLimiter, loginValidation, loginUser);
router.post('/refresh', authLimiter, refreshAccessToken);

// Private routes
router.post('/logout', protect, logoutUser);
router.get('/me', protect, getCurrentUser);
router.get('/users', protect, searchUsers);

module.exports = router;
