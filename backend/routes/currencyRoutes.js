const express = require('express');
const router = express.Router();
const { getCurrencyRates, getSupportedCurrencies } = require('../controllers/currencyController');

// GET /api/currency/rates?base=USD
router.get('/rates', getCurrencyRates);

// GET /api/currency/supported
router.get('/supported', getSupportedCurrencies);

module.exports = router;
