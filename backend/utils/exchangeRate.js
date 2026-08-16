/**
 * Exchange Rate Utility
 * Uses open.er-api.com — free, no API key required, 160+ currencies
 * Rates cached in-memory for 1 hour per base currency.
 */

const https = require('https');

// ── In-memory cache ──────────────────────────────────────────────────────────
const cache = {}; // { [baseCurrency]: { rates: {}, fetchedAt: Date } }
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch rates from API (raw https to avoid adding axios dep in backend utils).
 */
const fetchFromAPI = (baseCurrency) =>
    new Promise((resolve, reject) => {
        const url = `https://open.er-api.com/v6/latest/${baseCurrency.toUpperCase()}`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.result === 'success') {
                        resolve(parsed.rates);
                    } else {
                        reject(new Error(`Exchange rate API error: ${parsed['error-type'] || 'unknown'}`));
                    }
                } catch {
                    reject(new Error('Failed to parse exchange rate response'));
                }
            });
        }).on('error', (err) => reject(err));
    });

/**
 * Get exchange rates for a base currency (with caching).
 * @param {string} baseCurrency - ISO 4217 code e.g. "USD"
 * @returns {Promise<Object>} rates map { EUR: 0.91, INR: 83.1, ... }
 */
const getRates = async (baseCurrency = 'USD') => {
    const key = baseCurrency.toUpperCase();
    const now = Date.now();

    if (cache[key] && now - cache[key].fetchedAt < CACHE_TTL_MS) {
        return cache[key].rates;
    }

    const rates = await fetchFromAPI(key);
    cache[key] = { rates, fetchedAt: now };
    return rates;
};

/**
 * Convert an amount from one currency to another.
 * @param {number} amount
 * @param {string} from - ISO 4217 e.g. "USD"
 * @param {string} to   - ISO 4217 e.g. "EUR"
 * @returns {Promise<number>}
 */
const convertAmount = async (amount, from, to) => {
    const fromKey = from.toUpperCase();
    const toKey = to.toUpperCase();

    if (fromKey === toKey) return amount;

    const rates = await getRates(fromKey);
    const rate = rates[toKey];

    if (!rate) {
        throw new Error(`No exchange rate found for ${fromKey} → ${toKey}`);
    }

    return parseFloat((amount * rate).toFixed(4));
};

/**
 * Major supported currencies with symbols.
 */
const SUPPORTED_CURRENCIES = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
    { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
    { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
    { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
    { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
];

/**
 * Get the symbol for a currency code. Falls back to the code itself.
 */
const getCurrencySymbol = (code) => {
    const found = SUPPORTED_CURRENCIES.find(c => c.code === (code || '').toUpperCase());
    return found ? found.symbol : code;
};

module.exports = { getRates, convertAmount, SUPPORTED_CURRENCIES, getCurrencySymbol };
