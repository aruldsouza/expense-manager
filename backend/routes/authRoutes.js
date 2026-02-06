const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    getCurrentUser,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get token
 * @access  Public
 */
router.post('/login', loginUser);

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged-in user
 * @access  Private (requires authentication)
 */
router.get('/me', protect, getCurrentUser);

module.exports = router;
