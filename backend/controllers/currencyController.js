const { getRates, SUPPORTED_CURRENCIES } = require('../utils/exchangeRate');

// @desc  Get exchange rates for a base currency (cached 1 hr)
// @route GET /api/currency/rates?base=USD
// @access Public
const getCurrencyRates = async (req, res, next) => {
    try {
        const base = (req.query.base || 'USD').toUpperCase();
        const rates = await getRates(base);
        res.json({ success: true, base, rates });
    } catch (error) {
        next(error);
    }
};

// @desc  Get list of supported currencies
// @route GET /api/currency/supported
// @access Public
const getSupportedCurrencies = (req, res) => {
    res.json({ success: true, data: SUPPORTED_CURRENCIES });
};

module.exports = { getCurrencyRates, getSupportedCurrencies };
