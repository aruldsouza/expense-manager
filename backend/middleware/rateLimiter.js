const rateLimit = require('express-rate-limit');

// ─── Generic JSON error formatter ─────────────────────────────────────────────
const rateLimitHandler = (message) => (req, res) => {
    res.status(429).json({
        success: false,
        error: message,
        retryAfter: res.getHeader('Retry-After')
    });
};

// ─── Auth routes (login / register): 10 requests / 15 minutes ─────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,         // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler('Too many auth requests. Please try again in 15 minutes.')
});

// ─── Global API limiter: 200 requests / minute per IP ─────────────────────────
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,              // 1 minute
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler('Too many requests. Please slow down.')
});

// ─── Sensitive write operations: 30 per minute per IP ─────────────────────────
const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler('Too many write operations. Please slow down.')
});

// ─── AI endpoint: 20 per minute per IP (LLM calls are expensive) ─────────────
const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler('AI request limit reached. Please wait a moment.')
});

module.exports = { authLimiter, apiLimiter, writeLimiter, aiLimiter };
