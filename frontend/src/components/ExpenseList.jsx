import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { ListGroup, Badge, Spinner, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaMoneyBillWave, FaUser, FaExchangeAlt } from 'react-icons/fa';
import { useCurrency } from '../context/CurrencyContext';

const ExpenseList = ({ groupId, groupCurrency, refreshTrigger }) => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { displayCurrency, formatCurrency, convertAmount } = useCurrency();
    const [convertedAmounts, setConvertedAmounts] = useState({}); // { expenseId: number }

    const gc = groupCurrency || 'USD';
    const needsConversion = displayCurrency && displayCurrency !== gc;

    useEffect(() => {
        const fetchExpenses = async () => {
            try {
                const res = await api.get(`/groups/${groupId}/expenses`);
                if (res.data.success) setExpenses(res.data.data);
            } catch {
                setError('Failed to load expenses');
            } finally {
                setLoading(false);
            }
        };
        fetchExpenses();
    }, [groupId, refreshTrigger]);

    // Convert all expense amounts when display currency or expenses change
    useEffect(() => {
        if (!needsConversion || expenses.length === 0) {
            setConvertedAmounts({});
            return;
        }
        let cancelled = false;
        const doConvert = async () => {
            const result = {};
            await Promise.all(expenses.map(async (exp) => {
                try {
                    const converted = await convertAmount(exp.amount, gc, displayCurrency);
                    result[exp._id] = converted;
                } catch { result[exp._id] = null; }
            }));
            if (!cancelled) setConvertedAmounts(result);
        };
        doConvert();
        return () => { cancelled = true; };
    }, [expenses, gc, displayCurrency, needsConversion, convertAmount]);

    if (loading) return <div className="text-center py-4"><Spinner animation="border" variant="primary" size="sm" /></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;
    if (expenses.length === 0) return <div className="text-center py-4 text-muted">No expenses recorded yet.</div>;

    return (
        <ListGroup variant="flush">
            {expenses.map((expense) => {
                const converted = convertedAmounts[expense._id];
                return (
                    <ListGroup.Item key={expense._id} className="d-flex justify-content-between align-items-center py-3">
                        <div className="d-flex align-items-center gap-3">
                            <div className="bg-light p-2 rounded-circle text-primary">
                                <FaMoneyBillWave size={20} />
                            </div>
                            <div>
                                <h6 className="mb-0 fw-bold">{expense.description}</h6>
                                <small className="text-muted d-flex align-items-center gap-1">
                                    <FaUser size={10} />
                                    <span className="fw-bold">{expense.payer?.name || 'Unknown'}</span>
                                    {' '}paid {formatCurrency(expense.amount, gc)}
                                </small>
                                <div className="text-muted small mt-1">
                                    <span className="me-1">Splits:</span>
                                    {expense.splits.map((split, idx) => (
                                        <Badge bg="secondary" className="me-1 fw-normal text-white" key={idx}>
                                            {split.user?.name}: {formatCurrency(split.amount, gc)}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="text-end">
                            <h5 className="mb-0 fw-bold text-dark">{formatCurrency(expense.amount, gc)}</h5>
                            {/* Dual-currency: show converted amount if display ≠ group currency */}
                            {needsConversion && converted != null && (
                                <OverlayTrigger placement="top" overlay={<Tooltip>≈ in {displayCurrency}</Tooltip>}>
                                    <small className="text-muted d-flex align-items-center justify-content-end gap-1 mt-1">
                                        <FaExchangeAlt size={9} />
                                        ≈ {formatCurrency(converted, displayCurrency)}
                                    </small>
                                </OverlayTrigger>
                            )}
                            <small className="text-muted d-block">{new Date(expense.date).toLocaleDateString()}</small>
                        </div>
                    </ListGroup.Item>
                );
            })}
        </ListGroup>
    );
};

export default ExpenseList;
