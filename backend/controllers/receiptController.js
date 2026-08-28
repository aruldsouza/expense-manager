/**
 * receiptController.js
 *
 * Handles POST /api/receipt/scan
 *
 * 1. Receives a receipt image upload (multipart/form-data, field name: "receipt")
 * 2. Validates file type and size (already enforced by multer in the route,
 *    but we do a second-pass check here for defence-in-depth)
 * 3. Sends the image buffer to geminiReceiptService
 * 4. Returns the structured receipt data as JSON to the frontend
 *
 * Security:
 * - The raw image is held in memory only for the duration of the request (memoryStorage).
 * - It is never written to disk or stored publicly.
 * - The GEMINI_API_KEY never leaves the server.
 */

'use strict';

const { extractReceiptData, GeminiReceiptError, SUPPORTED_MIME_TYPES } = require('../services/geminiReceiptService');

// Max file size in bytes (5 MB) — mirrors multer limit as a belt-and-suspenders check
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * POST /api/receipt/scan
 * @access Private (requires valid JWT via authMiddleware)
 */
const scanReceipt = async (req, res, next) => {
    try {
        // ── 1. Ensure a file was uploaded ─────────────────────────────────────
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No receipt image provided. Please upload a JPG, PNG, or WEBP image.'
            });
        }

        const { buffer, mimetype, originalname, size } = req.file;

        // ── 2. File type validation (second-pass) ─────────────────────────────
        if (!SUPPORTED_MIME_TYPES.includes(mimetype)) {
            return res.status(415).json({
                success: false,
                error: `Unsupported file type: ${mimetype}. Please upload a JPG, PNG, or WEBP image.`
            });
        }

        // ── 3. File size validation (second-pass) ─────────────────────────────
        if (size > MAX_FILE_SIZE) {
            return res.status(413).json({
                success: false,
                error: `File too large (${(size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 5 MB.`
            });
        }

        // ── 4. Send to Gemini AI for extraction ───────────────────────────────
        const receiptData = await extractReceiptData(buffer, mimetype);

        // ── 5. Return structured JSON to frontend ─────────────────────────────
        return res.status(200).json({
            success: true,
            data: {
                ...receiptData,
                _meta: {
                    extractedBy: 'gemini-1.5-flash',
                    extractedAt: new Date().toISOString(),
                    sourceFile: originalname,
                    aiGenerated: true  // Signals frontend to show "AI-extracted, please review" notice
                }
            }
        });

    } catch (err) {
        // ── Known Gemini errors: forward status + friendly message ─────────────
        if (err instanceof GeminiReceiptError) {
            return res.status(err.status).json({
                success: false,
                error: err.message,
                code: err.code
            });
        }

        // ── Unknown error: pass to global error handler ───────────────────────
        next(err);
    }
};

module.exports = { scanReceipt };
