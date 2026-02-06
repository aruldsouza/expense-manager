const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * JWT Authentication Middleware
 * Protects routes by verifying JWT token
 * Attaches authenticated user to request object
 */
const protect = async (req, res, next) => {
    let token;

    // Check if authorization header exists and starts with 'Bearer'
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Extract token from header (format: "Bearer <token>")
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token (exclude password)
            req.user = await User.findById(decoded.id).select('-password');

            // Check if user exists
            if (!req.user) {
                res.status(401);
                return next(new Error('Not authorized - user not found'));
            }

            // Proceed to next middleware
            next();
        } catch (error) {
            console.error('Auth Middleware Error:', error.message);
            res.status(401);

            if (error.name === 'TokenExpiredError') {
                return next(new Error('Not authorized - token expired'));
            } else if (error.name === 'JsonWebTokenError') {
                return next(new Error('Not authorized - invalid token'));
            }

            return next(new Error('Not authorized - token verification failed'));
        }
    }

    // No token provided
    if (!token) {
        res.status(401);
        return next(new Error('Not authorized - no token provided'));
    }
};

module.exports = { protect };
