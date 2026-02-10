const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    getCurrentUser,
    searchUsers
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validate');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', registerValidation, registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get token
 * @access  Public
 */
router.post('/login', loginValidation, loginUser);

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged-in user
 * @access  Private (requires authentication)
 */
router.get('/me', protect, getCurrentUser);

/**
 * @route   GET /api/auth/users
 * @desc    Search users
 * @access  Private
 */
router.get('/users', protect, searchUsers);

module.exports = router;
