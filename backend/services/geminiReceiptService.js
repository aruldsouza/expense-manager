/**
 * geminiReceiptService.js
 *
 * Dedicated Gemini Vision service for AI-powered receipt image extraction.
 *
 * Public API:
 *   extractReceiptData(imageBuffer, mimeType) → ReceiptData
 *
 * ReceiptData schema:
 * {
 *   merchant:   string | null,
 *   date:       "YYYY-MM-DD" | null,
 *   currency:   string | null,          // e.g. "USD", "$", "INR"
 *   subtotal:   number | null,
 *   tax:        number | null,
 *   discount:   number | null,
 *   total:      number | null,
 *   category:   string | null,          // e.g. "Food & Dining", "Grocery"
 *   lineItems: [
 *     {
 *       name:       string,
 *       quantity:   number | null,
 *       unitPrice:  number | null,
 *       totalPrice: number | null
 *     }
 *   ]
 * }
 */

'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Allowed MIME types ────────────────────────────────────────────────────────
const SUPPORTED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
];

// ─── Gemini model to use ───────────────────────────────────────────────────────
const GEMINI_MODEL = 'gemini-1.5-flash';

// ─── Strict receipt-extraction prompt ─────────────────────────────────────────
const RECEIPT_EXTRACTION_PROMPT = `You are a precise receipt data extraction system. Analyze the provided receipt image and extract all available information.

Return ONLY a single valid JSON object — no markdown, no code fences, no extra text — with exactly these fields:

{
  "merchant": "<store or restaurant name as printed, or null>",
  "date": "<transaction date in YYYY-MM-DD format, or null>",
  "currency": "<ISO currency code (e.g. USD, INR, EUR) inferred from the symbol, or the symbol itself if unknown, or null>",
  "subtotal": <numeric subtotal before tax/discount, or null>,
  "tax": <numeric tax amount, or null>,
  "discount": <numeric discount/coupon savings as a positive number, or null>,
  "total": <numeric final total amount, or null>,
  "category": "<best matching category from: Food & Dining, Grocery, Shopping, Transportation, Healthcare, Entertainment, Utilities, Travel, Education, Personal Care, Electronics, Other — or null>",
  "lineItems": [
    {
      "name": "<item description>",
      "quantity": <numeric quantity or null>,
      "unitPrice": <numeric unit price or null>,
      "totalPrice": <numeric line total or null>
    }
  ]
}

Rules:
- All numeric values must be plain numbers (not strings). Do NOT include currency symbols inside numeric fields.
- If a field is not visible, unreadable, or absent, use null. Never guess or hallucinate values.
- lineItems must be an array (empty array [] if no individual items are visible).
- date must always be in YYYY-MM-DD format if present.
- Return ONLY the JSON object. No explanation, no markdown.`;

// ─── Validate and normalize the raw object returned by Gemini ─────────────────
/**
 * Validates types and coerces values from the raw parsed JSON.
 * Missing or wrong-type fields are set to null instead of throwing.
 *
 * @param {object} raw - Parsed JSON from Gemini response
 * @returns {object}   - Normalized ReceiptData object
 */
function validateAndNormalize(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new GeminiReceiptError('Gemini returned a non-object JSON value.', 'PARSE_ERROR');
    }

    const toNumberOrNull = (v) => {
        if (v === null || v === undefined) return null;
        const n = Number(v);
        return isNaN(n) ? null : parseFloat(n.toFixed(4));
    };

    const toStringOrNull = (v) => {
        if (v === null || v === undefined) return null;
        const s = String(v).trim();
        return s.length > 0 ? s : null;
    };

    // Validate date format (YYYY-MM-DD)
    let date = null;
    if (raw.date && typeof raw.date === 'string') {
        const dateMatch = raw.date.match(/^\d{4}-\d{2}-\d{2}$/);
        if (dateMatch) {
            const parsed = new Date(raw.date);
            // Ensure it's a real calendar date
            if (!isNaN(parsed.getTime())) {
                date = raw.date;
            }
        }
    }

    // Validate and normalize line items
    let lineItems = [];
    if (Array.isArray(raw.lineItems)) {
        lineItems = raw.lineItems
            .filter(item => item && typeof item === 'object')
            .map(item => ({
                name:       toStringOrNull(item.name) || 'Unknown Item',
                quantity:   toNumberOrNull(item.quantity),
                unitPrice:  toNumberOrNull(item.unitPrice),
                totalPrice: toNumberOrNull(item.totalPrice)
            }));
    }

    return {
        merchant:  toStringOrNull(raw.merchant),
        date,
        currency:  toStringOrNull(raw.currency),
        subtotal:  toNumberOrNull(raw.subtotal),
        tax:       toNumberOrNull(raw.tax),
        discount:  toNumberOrNull(raw.discount),
        total:     toNumberOrNull(raw.total),
        category:  toStringOrNull(raw.category),
        lineItems
    };
}

// ─── Custom error class ────────────────────────────────────────────────────────
class GeminiReceiptError extends Error {
    /**
     * @param {string} message   - Human-readable error message
     * @param {string} code      - Machine-readable error code
     * @param {number} [status]  - Suggested HTTP status code
     */
    constructor(message, code, status = 500) {
        super(message);
        this.name = 'GeminiReceiptError';
        this.code = code;
        this.status = status;
    }
}

// ─── Parse the raw Gemini text response into a JSON object ────────────────────
function parseGeminiResponse(rawText) {
    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
        throw new GeminiReceiptError(
            'Gemini returned an empty response for this receipt.',
            'EMPTY_RESPONSE',
            502
        );
    }

    // Strip markdown code fences if Gemini wraps response in them despite the prompt
    let cleaned = rawText.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

    // Attempt to extract a JSON object if there is surrounding prose
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new GeminiReceiptError(
            'Could not find a valid JSON object in the Gemini response.',
            'PARSE_ERROR',
            502
        );
    }

    try {
        return JSON.parse(jsonMatch[0]);
    } catch {
        throw new GeminiReceiptError(
            'Gemini returned malformed JSON that could not be parsed.',
            'PARSE_ERROR',
            502
        );
    }
}

// ─── Map Gemini API errors to meaningful GeminiReceiptErrors ──────────────────
function handleGeminiApiError(err) {
    const message = err.message || '';

    // Authentication failure
    if (message.includes('API_KEY_INVALID') || message.includes('API key not valid')) {
        return new GeminiReceiptError(
            'The Gemini API key is invalid or has been revoked. Please check GEMINI_API_KEY.',
            'AUTH_ERROR',
            503
        );
    }

    // Quota / rate limit
    if (
        message.includes('RESOURCE_EXHAUSTED') ||
        message.includes('quota') ||
        message.includes('rate limit') ||
        err.status === 429
    ) {
        return new GeminiReceiptError(
            'The Gemini API quota has been exceeded. Please try again later.',
            'QUOTA_EXCEEDED',
            429
        );
    }

    // Timeout / network
    if (message.includes('ETIMEDOUT') || message.includes('timeout') || message.includes('ECONNRESET')) {
        return new GeminiReceiptError(
            'The request to the Gemini API timed out. Please try again.',
            'TIMEOUT',
            504
        );
    }

    // Safety filter blocked the content
    if (message.includes('SAFETY') || message.includes('blocked')) {
        return new GeminiReceiptError(
            'The receipt image was blocked by Gemini content filters. Please try a different image.',
            'CONTENT_BLOCKED',
            422
        );
    }

    // Unsupported image / invalid request
    if (message.includes('INVALID_ARGUMENT') || err.status === 400) {
        return new GeminiReceiptError(
            'The receipt image could not be processed by Gemini. Ensure it is a clear, supported image.',
            'INVALID_IMAGE',
            422
        );
    }

    // Generic Gemini server error
    if (err.status >= 500) {
        return new GeminiReceiptError(
            'The Gemini API returned a server error. Please try again later.',
            'GEMINI_SERVER_ERROR',
            502
        );
    }

    // Unknown error — wrap it
    return new GeminiReceiptError(
        'An unexpected error occurred while contacting the Gemini API.',
        'UNKNOWN_ERROR',
        500
    );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sends a receipt image buffer to Gemini Vision and returns structured
 * receipt data extracted by the AI.
 *
 * @param {Buffer} imageBuffer  - Raw binary image buffer
 * @param {string} mimeType     - MIME type: 'image/jpeg' | 'image/png' | 'image/webp'
 * @returns {Promise<object>}   - Normalized ReceiptData object
 * @throws {GeminiReceiptError} - On any failure (API, parse, validation)
 */
async function extractReceiptData(imageBuffer, mimeType) {
    // ── Guard: API key ──────────────────────────────────────────────────────
    if (!process.env.GEMINI_API_KEY) {
        throw new GeminiReceiptError(
            'Gemini AI is not configured. Set GEMINI_API_KEY in the server environment.',
            'MISSING_API_KEY',
            503
        );
    }

    // ── Guard: mime type ────────────────────────────────────────────────────
    if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
        throw new GeminiReceiptError(
            `Unsupported image type: ${mimeType}. Supported types: JPG, PNG, WEBP.`,
            'UNSUPPORTED_FORMAT',
            415
        );
    }

    // ── Guard: buffer ───────────────────────────────────────────────────────
    if (!imageBuffer || !Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
        throw new GeminiReceiptError(
            'Image buffer is empty or invalid.',
            'INVALID_IMAGE',
            422
        );
    }

    // ── Prepare image part for Gemini ───────────────────────────────────────
    const base64Image = imageBuffer.toString('base64');
    const imagePart = {
        inlineData: {
            data: base64Image,
            mimeType
        }
    };

    // ── Call Gemini API ─────────────────────────────────────────────────────
    let rawText;
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

        const result = await model.generateContent([RECEIPT_EXTRACTION_PROMPT, imagePart]);
        rawText = result.response.text();
    } catch (err) {
        // Only re-wrap if it's not already our custom error
        if (err instanceof GeminiReceiptError) throw err;
        throw handleGeminiApiError(err);
    }

    // ── Parse JSON from Gemini text ─────────────────────────────────────────
    const rawJson = parseGeminiResponse(rawText);

    // ── Validate and normalize ──────────────────────────────────────────────
    const receiptData = validateAndNormalize(rawJson);

    return receiptData;
}

module.exports = {
    extractReceiptData,
    GeminiReceiptError,
    SUPPORTED_MIME_TYPES
};
