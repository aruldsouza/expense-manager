/**
 * receiptRoutes.js
 *
 * Routes for AI-powered receipt scanning.
 *
 * Mounted at: /api/receipt
 *
 * POST /api/receipt/scan
 *   - Requires: Bearer JWT (authMiddleware)
 *   - Body: multipart/form-data with field "receipt" (image file)
 *   - Returns: Structured JSON receipt data extracted by Gemini AI
 */

'use strict';

const express = require('express');
const multer  = require('multer');
const { authMiddleware } = require('../middleware/auth');
const { scanReceipt }    = require('../controllers/receiptController');
const { aiLimiter }      = require('../middleware/rateLimiter');

const router = express.Router();

// ─── Multer: in-memory storage (image is never written to disk or cloud) ───────
// The buffer is passed directly to the Gemini API and discarded after the request.
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        // Reject the file — multer will not populate req.file
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname), false);
    }
};

const uploadReceiptMemory = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
        files: 1
    }
}).single('receipt');

// ─── Multer error handler wrapper ──────────────────────────────────────────────
// Converts multer errors into consistent JSON error responses before hitting
// the controller. This prevents raw multer error objects leaking to the client.
const handleUpload = (req, res, next) => {
    uploadReceiptMemory(req, res, (err) => {
        if (!err) return next();

        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({
                    success: false,
                    error: 'File too large. Maximum allowed size is 5 MB.',
                    code: 'FILE_TOO_LARGE'
                });
            }
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(415).json({
                    success: false,
                    error: 'Unsupported file type. Please upload a JPG, PNG, or WEBP image.',
                    code: 'UNSUPPORTED_FORMAT'
                });
            }
            return res.status(400).json({
                success: false,
                error: `Upload error: ${err.message}`,
                code: err.code
            });
        }

        // Non-multer error
        next(err);
    });
};

// ─── Routes ────────────────────────────────────────────────────────────────────

// POST /api/receipt/scan
// Requires authentication. Applies AI rate limiting (same limiter used by chat AI).
router.post(
    '/scan',
    authMiddleware,
    aiLimiter,
    handleUpload,
    scanReceipt
);

module.exports = router;
