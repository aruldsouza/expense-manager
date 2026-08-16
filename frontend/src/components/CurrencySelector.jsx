import React from 'react';
import { Form } from 'react-bootstrap';
import { useCurrency } from '../context/CurrencyContext';
import { FaGlobe } from 'react-icons/fa';

// Compact inline currency switcher for the Navbar
const CurrencySelector = () => {
    const { displayCurrency, setDisplayCurrency, supportedCurrencies } = useCurrency();

    // Fallback list in case the API hasn't loaded yet
    const options = supportedCurrencies.length > 0
        ? supportedCurrencies
        : [
            { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' },
            { code: 'GBP', symbol: '£' }, { code: 'INR', symbol: '₹' },
            { code: 'JPY', symbol: '¥' }, { code: 'CAD', symbol: 'CA$' },
            { code: 'AUD', symbol: 'A$' }, { code: 'CNY', symbol: '¥' },
        ];

    return (
        <div className="d-flex align-items-center gap-1" title="Display Currency">
            <FaGlobe className="text-muted" size={13} />
            <Form.Select
                size="sm"
                value={displayCurrency}
                onChange={e => setDisplayCurrency(e.target.value)}
                style={{ width: 'auto', fontSize: '0.8rem', padding: '2px 24px 2px 6px', border: '1px solid #dee2e6', borderRadius: '6px' }}
                aria-label="Display currency"
            >
                {options.map(c => (
                    <option key={c.code} value={c.code}>
                        {c.code} {c.symbol || ''}
                    </option>
                ))}
            </Form.Select>
        </div>
    );
};

export default CurrencySelector;
