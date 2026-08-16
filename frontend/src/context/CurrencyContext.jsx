import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const CurrencyContext = createContext(null);

// Hardcoded symbol map (mirrors backend SUPPORTED_CURRENCIES)
const SYMBOL_MAP = {
    USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', CAD: 'CA$',
    AUD: 'A$', CHF: 'Fr', CNY: '¥', HKD: 'HK$', SGD: 'S$', MXN: 'MX$',
    BRL: 'R$', KRW: '₩', SEK: 'kr', NOK: 'kr', DKK: 'kr', NZD: 'NZ$',
    ZAR: 'R', AED: 'د.إ', THB: '฿', MYR: 'RM', IDR: 'Rp', PHP: '₱',
    PKR: '₨', BDT: '৳', RUB: '₽', TRY: '₺', PLN: 'zł', CZK: 'Kč',
};

export const getCurrencySymbol = (code) => SYMBOL_MAP[code?.toUpperCase()] || code || '$';

export const CurrencyProvider = ({ children }) => {
    const [displayCurrency, setDisplayCurrencyState] = useState(
        () => localStorage.getItem('displayCurrency') || 'USD'
    );
    // Rate cache: { [base]: { rates, fetchedAt } }
    const [rateCache, setRateCache] = useState({});
    const [supportedCurrencies, setSupportedCurrencies] = useState([]);

    // Load supported currencies on mount
    useEffect(() => {
        api.get('/currency/supported')
            .then(r => setSupportedCurrencies(r.data.data))
            .catch(() => { }); // silent fail — fallback handled in CurrencySelector
    }, []);

    const setDisplayCurrency = (code) => {
        localStorage.setItem('displayCurrency', code);
        setDisplayCurrencyState(code);
    };

    /**
     * Get rates for a base currency (cached 10 min client-side).
     */
    const getRates = useCallback(async (base) => {
        const key = base.toUpperCase();
        const cached = rateCache[key];
        if (cached && Date.now() - cached.fetchedAt < 10 * 60 * 1000) {
            return cached.rates;
        }
        try {
            const res = await api.get(`/currency/rates?base=${key}`);
            const rates = res.data.rates;
            setRateCache(prev => ({ ...prev, [key]: { rates, fetchedAt: Date.now() } }));
            return rates;
        } catch {
            return null;
        }
    }, [rateCache]);

    /**
     * Convert amount from one currency to another.
     * Returns null on failure (UI can fall back gracefully).
     */
    const convertAmount = useCallback(async (amount, fromCurrency, toCurrency) => {
        const from = fromCurrency?.toUpperCase() || 'USD';
        const to = toCurrency?.toUpperCase() || 'USD';
        if (from === to) return amount;

        const rates = await getRates(from);
        if (!rates || !rates[to]) return null;
        return parseFloat((amount * rates[to]).toFixed(2));
    }, [getRates]);

    /**
     * Format a number as currency string.
     * e.g. formatCurrency(1234.5, 'INR') => '₹1,234.50'
     */
    const formatCurrency = (amount, currencyCode) => {
        const code = currencyCode?.toUpperCase() || 'USD';
        try {
            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: code,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(amount);
        } catch {
            return `${getCurrencySymbol(code)}${Number(amount).toFixed(2)}`;
        }
    };

    return (
        <CurrencyContext.Provider value={{
            displayCurrency,
            setDisplayCurrency,
            supportedCurrencies,
            convertAmount,
            formatCurrency,
            getCurrencySymbol,
        }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => {
    const ctx = useContext(CurrencyContext);
    if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
    return ctx;
};

export default CurrencyContext;
