/**
 * geminiReceiptService.js  (Task 3 enhanced)
 *
 * Dedicated Gemini Vision service for AI-powered receipt image extraction.
 *
 * Public API:
 *   extractReceiptData(imageBuffer, mimeType) → ReceiptData
 *
 * ReceiptData schema (Task 3.6 — all charge types captured):
 * {
 *   merchant:      string | null,      // Task 3.2 — store/restaurant name
 *   date:          "YYYY-MM-DD" | null,// Task 3.3 — normalized date
 *   currency:      string | null,      // Task 3.4 — ISO code (USD, INR, EUR …)
 *   subtotal:      number | null,      // Task 3.6 — pre-tax/discount total
 *   tax:           number | null,      // Task 3.6 — tax amount
 *   discount:      number | null,      // Task 3.6 — savings (positive number)
 *   serviceCharge: number | null,      // Task 3.6 — service / delivery fee
 *   total:         number | null,      // Task 3.6 — final amount due
 *   category:      string | null,      // Task 3.7 — auto-suggested category
 *   lineItems: [                        // Task 3.5 — all line items
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

// ─── Gemini model ──────────────────────────────────────────────────────────────
const GEMINI_MODEL = 'gemini-1.5-flash';

// ─── Task 3.1 — Comprehensive Gemini receipt-extraction prompt ─────────────────
// The prompt is deliberately verbose and rule-heavy to minimise hallucination
// and maximise extraction accuracy across receipt types and locales.
const RECEIPT_EXTRACTION_PROMPT = `You are an expert receipt OCR and data extraction system.
Your job is to read the ENTIRE receipt image — including headers, body, and footer —
and return structured data as a single valid JSON object.

RETURN FORMAT — output ONLY this JSON object, no markdown, no code fences, no commentary:

{
  "merchant": "<The store, restaurant, or vendor name exactly as printed. Use proper casing. null if not visible.>",
  "date": "<Transaction date strictly in YYYY-MM-DD format (e.g. 2024-08-15). null if not found.>",
  "currency": "<ISO 4217 currency code inferred from the currency symbol or locale (e.g. USD, INR, EUR, GBP, AED, SGD, CAD, AUD, JPY). If you cannot determine the ISO code, use the raw symbol. null if absent.>",
  "subtotal": <Numeric subtotal amount before tax and discounts. Do NOT include currency symbols. null if not present.>,
  "tax": <Numeric total tax amount (GST, VAT, HST, service tax, etc.). null if not present.>,
  "discount": <Numeric total discount or coupon savings as a POSITIVE number (e.g. 5.00 if saving is -5.00). null if none.>,
  "serviceCharge": <Numeric service charge, delivery fee, packing charge, or surcharge. null if none.>,
  "total": <Numeric final total amount actually due or charged. null if not present.>,
  "category": "<Single best-matching category from ONLY these options: Food & Dining, Grocery, Shopping, Transportation, Healthcare, Entertainment, Utilities, Travel, Education, Personal Care, Electronics, Other. Base your choice on the merchant name, store type, and items purchased. null if completely unclear.>",
  "lineItems": [
    {
      "name": "<Item description as printed on the receipt. Clean up abbreviations where obvious.>",
      "quantity": <Numeric quantity purchased. null if not shown.>,
      "unitPrice": <Numeric price per unit. null if not shown.>,
      "totalPrice": <Numeric line-item total (quantity × unitPrice). null if not shown.>
    }
  ]
}

EXTRACTION RULES — follow these exactly:
1. Read the ENTIRE receipt from top to bottom before producing output.
2. merchant: Use the largest / most prominent store name at the top. Include branch name if printed. Exclude address and phone numbers.
3. date: Look for date in any format (DD/MM/YYYY, MM-DD-YYYY, "Aug 15 2024", "15-Aug-24", etc.) and convert to YYYY-MM-DD. Use the TRANSACTION date, not print date.
4. currency: Identify from: "$" → USD (or CAD/AUD/SGD based on context), "₹" → INR, "€" → EUR, "£" → GBP, "¥" or "¥" → JPY or CNY, "AED" → AED, "د.إ" → AED. Always prefer ISO code.
5. subtotal: The pre-tax, pre-discount sum. Often labelled "Subtotal", "Sub Total", "Net Amount", "Taxable Amount".
6. tax: Sum ALL tax lines (CGST + SGST, VAT, GST, tax). Combine into one number.
7. discount: Sum ALL discount lines (coupons, member discounts, promotional savings). Return as a positive number.
8. serviceCharge: Include delivery fees, packing charges, service fees, platform fees, convenience charges.
9. total: The final "Total", "Grand Total", "Amount Due", "Net Payable". This is what was actually paid.
10. lineItems: Extract EVERY product/service line. Skip summary lines (subtotal, tax, total, discount). Include even items with quantity 1 if they are products.
11. NEVER hallucinate or guess numeric values. If a field is not clearly readable, use null.
12. All numeric fields must be plain JavaScript numbers (e.g. 12.50), NOT strings.
13. lineItems must always be an array. Use [] if no individual items are distinguishable.
14. Output ONLY the JSON object. Zero extra text.`;

// ─── Task 3.4 — Currency symbol → ISO code normalizer ─────────────────────────
/**
 * Maps common currency symbols and partial codes to ISO 4217 codes.
 * Called after Gemini responds, as a safety normalization layer.
 *
 * @param {string|null} raw - Currency string from Gemini
 * @returns {string|null}   - ISO 4217 code or cleaned string
 */
const CURRENCY_SYMBOL_MAP = {
    '$':   'USD',
    'US$': 'USD',
    'USD': 'USD',
    'CA$': 'CAD',
    'CAD': 'CAD',
    'A$':  'AUD',
    'AUD': 'AUD',
    'S$':  'SGD',
    'SGD': 'SGD',
    'NZ$': 'NZD',
    'NZD': 'NZD',
    '₹':   'INR',
    'INR': 'INR',
    '€':   'EUR',
    'EUR': 'EUR',
    '£':   'GBP',
    'GBP': 'GBP',
    '¥':   'JPY',
    '円':  'JPY',
    'JPY': 'JPY',
    '元':  'CNY',
    '¥':   'CNY',  // Covered by both; context-dependent — default to CNY for mainland
    'CNY': 'CNY',
    'RMB': 'CNY',
    'د.إ': 'AED',
    'AED': 'AED',
    'ر.س': 'SAR',
    'SAR': 'SAR',
    'QR':  'QAR',
    'QAR': 'QAR',
    '₩':   'KRW',
    'KRW': 'KRW',
    '฿':   'THB',
    'THB': 'THB',
    'RM':  'MYR',
    'MYR': 'MYR',
    'Rp':  'IDR',
    'IDR': 'IDR',
    '₦':   'NGN',
    'NGN': 'NGN',
    '₵':   'GHS',
    'GHS': 'GHS',
    'R':   'ZAR',
    'ZAR': 'ZAR',
    'CHF': 'CHF',
    'Fr':  'CHF',
    'kr':  'SEK',   // Ambiguous (SEK/NOK/DKK); default SEK
    'SEK': 'SEK',
    'NOK': 'NOK',
    'DKK': 'DKK',
    'BRL': 'BRL',
    'R$':  'BRL',
    'MXN': 'MXN',
    'MX$': 'MXN',
    '₱':   'PHP',
    'PHP': 'PHP',
    '₫':   'VND',
    'VND': 'VND',
    'PKR': 'PKR',
    'Rs':  'PKR',   // Ambiguous (INR/PKR/LKR); fallback to PKR
    'LKR': 'LKR',
    'BDT': 'BDT',
    '৳':   'BDT',
    'NPR': 'NPR',
    '₨':   'NPR',
    'HKD': 'HKD',
    'HK$': 'HKD',
    'TWD': 'TWD',
    'NT$': 'TWD',
    'TRY': 'TRY',
    '₺':   'TRY',
    'RUB': 'RUB',
    '₽':   'RUB',
    'UAH': 'UAH',
    '₴':   'UAH',
    'PLN': 'PLN',
    'zł':  'PLN',
    'CZK': 'CZK',
    'HUF': 'HUF',
    'RON': 'RON',
    'BGN': 'BGN',
    'HRK': 'HRK',
    'ILS': 'ILS',
    '₪':   'ILS',
    'EGP': 'EGP',
    'KWD': 'KWD',
    'BHD': 'BHD',
    'OMR': 'OMR',
    'JOD': 'JOD',
    'LBP': 'LBP',
};

function normalizeCurrency(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Direct map lookup (case-sensitive first)
    if (CURRENCY_SYMBOL_MAP[trimmed]) return CURRENCY_SYMBOL_MAP[trimmed];

    // Try uppercase (for codes like 'usd' → 'USD')
    const upper = trimmed.toUpperCase();
    for (const [key, val] of Object.entries(CURRENCY_SYMBOL_MAP)) {
        if (key.toUpperCase() === upper) return val;
    }

    // If Gemini already returned a 3-letter uppercase code not in our map, trust it
    if (/^[A-Z]{3}$/.test(upper)) return upper;

    // Return raw as fallback (symbol we don't know)
    return trimmed;
}

// ─── Task 3.3 — Robust date string → YYYY-MM-DD normalizer ───────────────────
/**
 * Attempts to parse a date string in many common receipt formats and returns
 * a normalized YYYY-MM-DD string. Returns null if parsing fails.
 *
 * Handles:
 *   - YYYY-MM-DD (already correct)
 *   - DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, MM-DD-YYYY
 *   - DD.MM.YYYY, YYYY.MM.DD
 *   - "Aug 15, 2024", "15-Aug-2024", "15 August 2024"
 *   - "08/15/24", "15/08/24" (2-digit year)
 *   - ISO timestamps (2024-08-15T...)
 *
 * @param {string|null} raw - Raw date string from Gemini
 * @returns {string|null}   - "YYYY-MM-DD" or null
 */
const MONTH_NAMES = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    january: 1, february: 2, march: 3, april: 4, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
};

function toISODate(y, m, d) {
    const year  = parseInt(y, 10);
    const month = parseInt(m, 10);
    const day   = parseInt(d, 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    // Expand 2-digit years: 00-29 → 2000-2029, 30-99 → 1930-1999
    const fullYear = year < 100 ? (year < 30 ? 2000 + year : 1900 + year) : year;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const padded = `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // Validate as real calendar date
    const d2 = new Date(padded + 'T00:00:00');
    if (isNaN(d2.getTime())) return null;
    return padded;
}

function normalizeDateString(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const s = raw.trim();
    if (!s) return null;

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        return toISODate(...s.split('-'));
    }

    // ISO timestamp (2024-08-15T12:34:56)
    const isoTs = s.match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (isoTs) return toISODate(isoTs[1], isoTs[2], isoTs[3]);

    // YYYY/MM/DD or YYYY.MM.DD
    const ymd = s.match(/^(\d{4})[\/.](\d{1,2})[\/.](\d{1,2})$/);
    if (ymd) return toISODate(ymd[1], ymd[2], ymd[3]);

    // DD/MM/YYYY or MM/DD/YYYY or DD-MM-YYYY or MM-DD-YYYY or DD.MM.YYYY
    const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (dmy) {
        const [, a, b, c] = dmy;
        const year = parseInt(c, 10);
        const fullYear = year < 100 ? (year < 30 ? 2000 + year : 1900 + year) : year;
        // Heuristic: if first part > 12, must be DD/MM/YYYY
        if (parseInt(a, 10) > 12) return toISODate(fullYear, b, a);
        // If second part > 12, must be MM/DD/YYYY
        if (parseInt(b, 10) > 12) return toISODate(fullYear, a, b);
        // Default: DD/MM/YYYY (more common on receipts outside US)
        return toISODate(fullYear, b, a);
    }

    // "15 Aug 2024" or "15-Aug-2024" or "15th August, 2024" or "Aug 15 2024"
    const textDate = s.match(
        /^(\d{1,2})(?:st|nd|rd|th)?[\s\-,]+([A-Za-z]+)[\s\-,]+(\d{2,4})$|^([A-Za-z]+)[\s\-,]+(\d{1,2})(?:st|nd|rd|th)?[\s\-,]+(\d{2,4})$/
    );
    if (textDate) {
        let day, monthStr, year;
        if (textDate[1]) {
            [, day, monthStr, year] = textDate;
        } else {
            [,,,, monthStr, day, year] = textDate;
        }
        const monthNum = MONTH_NAMES[monthStr.toLowerCase()];
        if (!monthNum) return null;
        return toISODate(year, monthNum, day);
    }

    // "Aug-15-2024" or "Aug.15.2024"
    const mdy2 = s.match(/^([A-Za-z]{3,9})[\-.](\d{1,2})[\-.](\d{2,4})$/);
    if (mdy2) {
        const monthNum = MONTH_NAMES[mdy2[1].toLowerCase()];
        if (!monthNum) return null;
        return toISODate(mdy2[3], monthNum, mdy2[2]);
    }

    // Fallback: try native Date parse (unreliable but better than nothing)
    try {
        const native = new Date(s);
        if (!isNaN(native.getTime())) {
            const y = native.getFullYear();
            const m = native.getMonth() + 1;
            const d = native.getDate();
            return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        }
    } catch { /* ignore */ }

    return null;
}

// ─── Task 3.7 — Backend category inference (keyword fallback) ─────────────────
/**
 * If Gemini returns no category or an invalid one, infer it from the
 * merchant name and item names using keyword matching.
 *
 * @param {string|null} merchantName
 * @param {Array}       lineItems
 * @returns {string}   - Category string (always a valid category, never null)
 */
const VALID_CATEGORIES = [
    'Food & Dining', 'Grocery', 'Shopping', 'Transportation',
    'Healthcare', 'Entertainment', 'Utilities', 'Travel',
    'Education', 'Personal Care', 'Electronics', 'Other'
];

const CATEGORY_KEYWORD_MAP = [
    { category: 'Food & Dining',  keywords: ['restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'biryani', 'swiggy', 'zomato', 'doordash', 'ubereats', 'domino', 'kfc', 'mcdonald', 'subway', 'starbucks', 'bar ', 'grill', 'kitchen', 'dhaba', 'bakery', 'diner', 'bistro', 'eatery', 'taco', 'sushi', 'noodle', 'pasta', 'tea', 'juice'] },
    { category: 'Grocery',        keywords: ['grocery', 'supermarket', 'hypermarket', 'bigbasket', 'reliance fresh', 'dmart', 'walmart', 'safeway', 'kroger', 'whole foods', 'trader joe', 'aldi', 'lidl', 'tesco', 'costco', 'fresh', 'mart', 'provisions', 'kirana', 'vegetables', 'fruits', 'milk', 'bread', 'eggs', 'rice', 'flour', 'dal', 'pulses', 'spices'] },
    { category: 'Shopping',       keywords: ['mall', 'clothing', 'apparel', 'fashion', 'zara', 'h&m', 'nike', 'adidas', 'amazon', 'flipkart', 'myntra', 'boutique', 'store', 'shop', 'retail', 'departmental', 'outlet', 't-shirt', 'jeans', 'shoes', 'accessories', 'handbag', 'jewellery', 'watch', 'lifestyle', 'max fashion', 'westside'] },
    { category: 'Transportation', keywords: ['uber', 'ola', 'lyft', 'taxi', 'cab', 'auto', 'metro', 'bus', 'train', 'flight', 'fuel', 'petrol', 'diesel', 'gas station', 'parking', 'toll', 'rapido', 'blablacar', 'redbus'] },
    { category: 'Healthcare',     keywords: ['pharmacy', 'medical', 'hospital', 'clinic', 'doctor', 'dentist', 'apollo', 'medplus', 'netmeds', '1mg', 'diagnostics', 'lab', 'medicine', 'tablet', 'capsule', 'prescription', 'health', 'chemist', 'drugstore', 'walgreens', 'cvs', 'boots'] },
    { category: 'Entertainment',  keywords: ['cinema', 'movie', 'theatre', 'netflix', 'spotify', 'gaming', 'game', 'bookmyshow', 'concert', 'event', 'ticket', 'amusement', 'theme park', 'bowling', 'escape room', 'play', 'fun', 'entertainment', 'pvr', 'inox'] },
    { category: 'Utilities',      keywords: ['electricity', 'water', 'gas bill', 'internet', 'broadband', 'mobile recharge', 'prepaid', 'postpaid', 'bill payment', 'telephone', 'dtv', 'cable', 'airtel', 'jio', 'vodafone', 'at&t', 'verizon', 'power', 'sewage', 'utility'] },
    { category: 'Travel',         keywords: ['hotel', 'resort', 'airbnb', 'oyo', 'treebo', 'makemytrip', 'booking.com', 'agoda', 'airline', 'air india', 'indigo', 'emirates', 'lufthansa', 'transit', 'hostel', 'guesthouse', 'trip', 'tour', 'sightseeing', 'travel', 'airport', 'departure'] },
    { category: 'Education',      keywords: ['school', 'college', 'university', 'tuition', 'coaching', 'course', 'academy', 'institute', 'library', 'books', 'stationery', 'pen', 'notebook', 'textbook', 'udemy', 'coursera', 'examination', 'fee', 'admission'] },
    { category: 'Personal Care',  keywords: ['salon', 'spa', 'beauty', 'parlour', 'parlor', 'haircut', 'manicure', 'pedicure', 'cosmetics', 'skincare', 'shampoo', 'conditioner', 'body wash', 'lotion', 'perfume', 'deodorant', 'trimmer', 'razor', 'nykaa', 'sephora', 'lakme'] },
    { category: 'Electronics',    keywords: ['electronics', 'mobile', 'laptop', 'computer', 'tablet', 'iphone', 'samsung', 'headphone', 'earphone', 'charger', 'cable', 'printer', 'camera', 'tv', 'television', 'apple store', 'best buy', 'croma', 'reliance digital', 'gadget', 'appliance'] },
];

function inferCategory(merchant, lineItems) {
    const searchText = [
        (merchant || '').toLowerCase(),
        ...(Array.isArray(lineItems) ? lineItems.map(i => (i.name || '').toLowerCase()) : [])
    ].join(' ');

    for (const { category, keywords } of CATEGORY_KEYWORD_MAP) {
        if (keywords.some(kw => searchText.includes(kw))) {
            return category;
        }
    }

    return 'Other';
}

// ─── Validate and normalize the raw JSON from Gemini ──────────────────────────
/**
 * Applies all Task 3 normalizers (currency, date, category) and
 * type-checks every field, replacing bad values with null.
 */
function validateAndNormalize(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new GeminiReceiptError('Gemini returned a non-object JSON value.', 'PARSE_ERROR');
    }

    const toNumberOrNull = (v) => {
        if (v === null || v === undefined) return null;
        // Strip any stray currency symbols or commas (e.g. "1,234.50")
        if (typeof v === 'string') {
            const cleaned = v.replace(/[^0-9.\-]/g, '');
            const n = parseFloat(cleaned);
            return isNaN(n) ? null : parseFloat(n.toFixed(4));
        }
        const n = Number(v);
        return isNaN(n) ? null : parseFloat(n.toFixed(4));
    };

    const toStringOrNull = (v) => {
        if (v === null || v === undefined) return null;
        const s = String(v).trim();
        return s.length > 0 && s.toLowerCase() !== 'null' ? s : null;
    };

    // Task 3.3 — normalize date (handles any format Gemini might return)
    const date = normalizeDateString(toStringOrNull(raw.date));

    // Task 3.4 — normalize currency to ISO code
    const currency = normalizeCurrency(toStringOrNull(raw.currency));

    // Task 3.5 — line items
    let lineItems = [];
    if (Array.isArray(raw.lineItems)) {
        lineItems = raw.lineItems
            .filter(item => item && typeof item === 'object')
            .map(item => ({
                name:       toStringOrNull(item.name) || 'Unknown Item',
                quantity:   toNumberOrNull(item.quantity),
                unitPrice:  toNumberOrNull(item.unitPrice),
                totalPrice: toNumberOrNull(item.totalPrice)
            }))
            // Filter out lines where all numeric fields are null and name looks like a summary line
            .filter(item => {
                const summaryNames = /^(subtotal|sub total|total|grand total|tax|gst|vat|discount|balance|amount due)/i;
                return !summaryNames.test(item.name) || item.totalPrice !== null;
            });
    }

    // Task 3.6 — all charge types
    const subtotal      = toNumberOrNull(raw.subtotal);
    const tax           = toNumberOrNull(raw.tax);
    const discount      = raw.discount !== null && raw.discount !== undefined
        ? Math.abs(toNumberOrNull(raw.discount) || 0) || null   // ensure positive
        : null;
    const serviceCharge = toNumberOrNull(raw.serviceCharge);
    const total         = toNumberOrNull(raw.total);

    // Task 3.2 — merchant name
    const merchant = toStringOrNull(raw.merchant);

    // Task 3.7 — category: use Gemini's suggestion if valid, else infer from merchant+items
    let category = toStringOrNull(raw.category);
    if (!category || !VALID_CATEGORIES.includes(category)) {
        category = inferCategory(merchant, lineItems);
    }

    return {
        merchant,
        date,
        currency,
        subtotal,
        tax,
        discount,
        serviceCharge,
        total,
        category,
        lineItems
    };
}

// ─── Custom error class ────────────────────────────────────────────────────────
class GeminiReceiptError extends Error {
    constructor(message, code, status = 500) {
        super(message);
        this.name   = 'GeminiReceiptError';
        this.code   = code;
        this.status = status;
    }
}

// ─── Parse raw Gemini text → JSON object ──────────────────────────────────────
function parseGeminiResponse(rawText) {
    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
        throw new GeminiReceiptError(
            'Gemini returned an empty response for this receipt.',
            'EMPTY_RESPONSE', 502
        );
    }

    let cleaned = rawText.trim();

    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');

    // Extract the outermost JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new GeminiReceiptError(
            'Could not find a valid JSON object in the Gemini response.',
            'PARSE_ERROR', 502
        );
    }

    try {
        return JSON.parse(jsonMatch[0]);
    } catch {
        throw new GeminiReceiptError(
            'Gemini returned malformed JSON that could not be parsed.',
            'PARSE_ERROR', 502
        );
    }
}

// ─── Map Gemini API errors → GeminiReceiptError ───────────────────────────────
function handleGeminiApiError(err) {
    const message = err.message || '';

    if (message.includes('API_KEY_INVALID') || message.includes('API key not valid')) {
        return new GeminiReceiptError(
            'The Gemini API key is invalid or has been revoked. Please check GEMINI_API_KEY.',
            'AUTH_ERROR', 503
        );
    }
    if (message.includes('RESOURCE_EXHAUSTED') || message.includes('quota') ||
        message.includes('rate limit') || err.status === 429) {
        return new GeminiReceiptError(
            'The Gemini API quota has been exceeded. Please try again later.',
            'QUOTA_EXCEEDED', 429
        );
    }
    if (message.includes('ETIMEDOUT') || message.includes('timeout') || message.includes('ECONNRESET')) {
        return new GeminiReceiptError(
            'The request to the Gemini API timed out. Please try again.',
            'TIMEOUT', 504
        );
    }
    if (message.includes('SAFETY') || message.includes('blocked')) {
        return new GeminiReceiptError(
            'The receipt image was blocked by Gemini content filters. Please try a different image.',
            'CONTENT_BLOCKED', 422
        );
    }
    if (message.includes('INVALID_ARGUMENT') || err.status === 400) {
        return new GeminiReceiptError(
            'The receipt image could not be processed by Gemini. Ensure it is a clear, supported image.',
            'INVALID_IMAGE', 422
        );
    }
    if (err.status >= 500) {
        return new GeminiReceiptError(
            'The Gemini API returned a server error. Please try again later.',
            'GEMINI_SERVER_ERROR', 502
        );
    }
    return new GeminiReceiptError(
        'An unexpected error occurred while contacting the Gemini API.',
        'UNKNOWN_ERROR', 500
    );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sends a receipt image buffer to Gemini Vision and returns structured,
 * normalized receipt data.
 *
 * @param {Buffer} imageBuffer  - Raw binary image buffer
 * @param {string} mimeType     - 'image/jpeg' | 'image/png' | 'image/webp'
 * @returns {Promise<object>}   - Normalized ReceiptData
 * @throws {GeminiReceiptError}
 */
async function extractReceiptData(imageBuffer, mimeType) {
    // Guard: API key
    if (!process.env.GEMINI_API_KEY) {
        throw new GeminiReceiptError(
            'Gemini AI is not configured. Set GEMINI_API_KEY in the server environment.',
            'MISSING_API_KEY', 503
        );
    }

    // Guard: mime type
    if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
        throw new GeminiReceiptError(
            `Unsupported image type: ${mimeType}. Supported types: JPG, PNG, WEBP.`,
            'UNSUPPORTED_FORMAT', 415
        );
    }

    // Guard: buffer
    if (!imageBuffer || !Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
        throw new GeminiReceiptError('Image buffer is empty or invalid.', 'INVALID_IMAGE', 422);
    }

    // Prepare image part for Gemini
    const imagePart = {
        inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType
        }
    };

    // Call Gemini API
    let rawText;
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent([RECEIPT_EXTRACTION_PROMPT, imagePart]);
        rawText = result.response.text();
    } catch (err) {
        if (err instanceof GeminiReceiptError) throw err;
        throw handleGeminiApiError(err);
    }

    // Parse JSON from Gemini text response
    const rawJson = parseGeminiResponse(rawText);

    // Validate, normalize, and return
    return validateAndNormalize(rawJson);
}

module.exports = {
    extractReceiptData,
    GeminiReceiptError,
    SUPPORTED_MIME_TYPES,
    // Exported for unit testing
    normalizeCurrency,
    normalizeDateString,
    inferCategory
};
