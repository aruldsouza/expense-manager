/**
 * Request Logger Middleware
 * Logs structured request/response lines:
 * [ISO-TS] METHOD /path IP:x.x.x.x STATUS Xms
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const timestamp = new Date().toISOString();
        const level = status >= 500 ? '❌' : status >= 400 ? '⚠️ ' : '✅';
        console.log(`${level} [${timestamp}] ${method} ${url} → ${status} (${duration}ms) IP:${ip}`);
    });

    next();
};

module.exports = requestLogger;
