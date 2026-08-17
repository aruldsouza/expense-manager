import React, { createContext, useContext, useState, useCallback } from 'react';

const CurrencyContext = createContext(null);

const SYMBOL_MAP = {
    USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', CAD: 'CA$',
    AUD: 'A$', CHF: 'Fr', CNY: '¥', HKD: 'HK$', SGD: 'S$', MXN: 'MX$',
    BRL: 'R$', KRW: '₩', SEK: 'kr', NOK: 'kr', DKK: 'kr', NZD: 'NZ$',
    ZAR: 'R', AED: 'د.إ', THB: '฿', MYR: 'RM', IDR: 'Rp', PHP: '₱',
    PKR: '₨', BDT: '৳', RUB: '₽', TRY: '₺', PLN: 'zł', CZK: 'Kč',
};

// eslint-disable-next-line react-refresh/only-export-components

const DEFAULT_CURRENCIES = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' }
];

export const getCurrencySymbol = (code) => SYMBOL_MAP[code?.toUpperCase()] || code || '$';


export const CurrencyProvider = ({ children }) => {
    const [displayCurrency, setDisplayCurrencyState] = useState(
        () => localStorage.getItem('displayCurrency') || 'USD'
    );
    const [supportedCurrencies] = useState(DEFAULT_CURRENCIES);

    const setDisplayCurrency = (code) => {
        localStorage.setItem('displayCurrency', code);
        setDisplayCurrencyState(code);
    };

    const convertAmount = useCallback(async (amount) => {
        return amount;
    }, []);

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
