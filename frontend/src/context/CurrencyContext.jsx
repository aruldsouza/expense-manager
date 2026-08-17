import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const CurrencyContext = createContext(null);

const SYMBOL_MAP = {
    USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', CAD: 'CA$',
    AUD: 'A$', CHF: 'Fr', CNY: '¥', HKD: 'HK$', SGD: 'S$', MXN: 'MX$',
    BRL: 'R$', KRW: '₩', SEK: 'kr', NOK: 'kr', DKK: 'kr', NZD: 'NZ$',
    ZAR: 'R', AED: 'د.إ', THB: '฿', MYR: 'RM', IDR: 'Rp', PHP: '₱',
    PKR: '₨', BDT: '৳', RUB: '₽', TRY: '₺', PLN: 'zł', CZK: 'Kč',
};

const DEFAULT_CURRENCIES = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' }
];

// eslint-disable-next-line react-refresh/only-export-components
export const getCurrencySymbol = (code) => SYMBOL_MAP[code?.toUpperCase()] || code || '$';



export const CurrencyProvider = ({ children }) => {
    const [displayCurrency, setDisplayCurrencyState] = useState(
        () => localStorage.getItem('displayCurrency') || 'USD'
    );
    const [rateCache, setRateCache] = useState({});
    const [supportedCurrencies, setSupportedCurrencies] = useState(DEFAULT_CURRENCIES);

    useEffect(() => {
        api.get('/currencies/supported')
            .then(r => {
                if (r.data?.data) setSupportedCurrencies(r.data.data);
            })
            .catch(() => { }); // fallback to DEFAULT_CURRENCIES
    }, []);

    const setDisplayCurrency = (code) => {
        localStorage.setItem('displayCurrency', code);
        setDisplayCurrencyState(code);
    };

    const getRates = useCallback(async (base) => {
        const key = base.toUpperCase();
        const cached = rateCache[key];
        if (cached && Date.now() - cached.fetchedAt < 10 * 60 * 1000) {
            return cached.rates;
        }
        try {
            const res = await api.get(`/currencies/rates?base=${key}`);
            const rates = res.data.data || res.data.rates;
            if (rates) {
                setRateCache(prev => ({ ...prev, [key]: { rates, fetchedAt: Date.now() } }));
                return rates;
            }
            return null;
        } catch {
            return null;
        }
    }, [rateCache]);

    const convertAmount = useCallback(async (amount, fromCurrency, toCurrency) => {
        const from = fromCurrency?.toUpperCase() || 'USD';
        const to = toCurrency?.toUpperCase() || 'USD';
        if (from === to || !amount) return amount;

        const rates = await getRates(from);
        if (!rates || !rates[to]) return amount;
        return parseFloat((amount * rates[to]).toFixed(2));
    }, [getRates]);

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


// eslint-disable-next-line react-refresh/only-export-components
export const useCurrency = () => {
    const ctx = useContext(CurrencyContext);
    if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
    return ctx;
};


export default CurrencyContext;
