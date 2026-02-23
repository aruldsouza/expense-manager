const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ─── Token generators ──────────────────────────────────────────────────────────
const generateAccessToken = (userId) =>
    jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });

const generateRefreshToken = (userId) =>
    jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET + '_refresh', {
        expiresIn: '30d'
    });

// Hash a refresh token before storing (so a DB leak doesn't expose live tokens)
const hashToken = (token) =>
    crypto.createHash('sha256').update(token).digest('hex');

// ─── Shared: build user response object ──────────────────────────────────────
const userPayload = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
});

/**
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            res.status(400);
            return next(new Error('Please provide name, email, and password'));
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            res.status(400);
            return next(new Error('User with this email already exists'));
        }

        const user = await User.create({ name, email, password });

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Store hashed refresh token
        user.refreshToken = hashToken(refreshToken);
        await user.save({ validateBeforeSave: false });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { user: userPayload(user), token: accessToken, refreshToken }
        });
    } catch (error) { next(error); }
};

/**
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400);
            return next(new Error('Please provide email and password'));
        }

        const user = await User.findOne({ email })
            .select('+password +loginAttempts +lockUntil +refreshToken');

        // ─── Account lock check ───────────────────────────────────────────────
        if (user && user.lockUntil && user.lockUntil > Date.now()) {
            const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
            res.status(423);
            return next(new Error(
                `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`
            ));
        }

        // ─── Credential check ─────────────────────────────────────────────────
        if (!user || !(await user.comparePassword(password))) {
            if (user) {
                user.loginAttempts = (user.loginAttempts || 0) + 1;
                if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
                    user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
                    await user.save({ validateBeforeSave: false });
                    res.status(423);
                    return next(new Error(
                        `Account locked after ${MAX_LOGIN_ATTEMPTS} failed attempts. Try again in 15 minutes.`
                    ));
                }
                await user.save({ validateBeforeSave: false });
            }
            res.status(401);
            return next(new Error('Invalid email or password'));
        }

        // ─── Successful login: reset lock state ────────────────────────────────
        user.loginAttempts = 0;
        user.lockUntil = null;

        // Issue tokens
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);
        user.refreshToken = hashToken(refreshToken);
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: { user: userPayload(user), token: accessToken, refreshToken }
        });
    } catch (error) { next(error); }
};

/**
 * @route   POST /api/auth/refresh
 * @desc    Exchange a valid refresh token for a new access token
 * @access  Public
 */
const refreshAccessToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400); throw new Error('Refresh token required');
        }

        // Verify the JWT signature / expiry
        let payload;
        try {
            payload = jwt.verify(
                refreshToken,
                process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET + '_refresh'
            );
        } catch {
            res.status(401); throw new Error('Invalid or expired refresh token');
        }

        // Match hashed token in DB
        const user = await User.findById(payload.id).select('+refreshToken');
        if (!user || user.refreshToken !== hashToken(refreshToken)) {
            res.status(401); throw new Error('Refresh token not recognised');
        }

        // Issue fresh access token (rotate refresh token too)
        const newAccessToken = generateAccessToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id);
        user.refreshToken = hashToken(newRefreshToken);
        await user.save({ validateBeforeSave: false });

        res.json({
            success: true,
            data: { token: newAccessToken, refreshToken: newRefreshToken }
        });
    } catch (error) { next(error); }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Revoke the stored refresh token
 * @access  Private
 */
const logoutUser = async (req, res, next) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) { next(error); }
};

/**
 * @route   GET /api/auth/me
 * @access  Private
 */
const getCurrentUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({ success: true, data: { user: userPayload(user) } });
    } catch (error) { next(error); }
};

/**
 * @route   GET /api/auth/users
 * @access  Private
 */
const searchUsers = async (req, res, next) => {
    try {
        const { query } = req.query;
        if (!query) { res.status(400); throw new Error('Please provide a search query'); }

        const users = await User.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        }).select('_id name email');

        const filteredUsers = users.filter(u => u._id.toString() !== req.user._id.toString());
        res.json({ success: true, data: filteredUsers });
    } catch (error) { next(error); }
};

module.exports = {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    getCurrentUser,
    searchUsers
};
