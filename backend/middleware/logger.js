/**
 * Request Logger Middleware
 * Logs incoming HTTP requests with method, path, and timestamp
 */
const requestLogger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl || req.url;

    console.log(`[${timestamp}] ${method} ${url}`);

    // Log response time
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${timestamp}] ${method} ${url} - ${res.statusCode} (${duration}ms)`);
    });

    next();
};

module.exports = requestLogger;
