import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { ListGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaMoneyBillWave, FaUser } from 'react-icons/fa';

const ExpenseList = ({ groupId, refreshTrigger }) => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchExpenses = async () => {
            // Reset loading state when trigger changes to show we are refetching
            // setLoading(true); 
            // actually better not to flash loading spinner on every small add, 
            // but initial load needs it.
            try {
                const res = await api.get(`/groups/${groupId}/expenses`);
                if (res.data.success) {
                    setExpenses(res.data.data);
                }
            } catch (err) {
                setError('Failed to load expenses');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchExpenses();
    }, [groupId, refreshTrigger]);

    if (loading) return <div className="text-center py-4"><Spinner animation="border" variant="primary" size="sm" /></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;
    if (expenses.length === 0) return <div className="text-center py-4 text-muted">No expenses recorded yet.</div>;

    return (
        <ListGroup variant="flush">
            {expenses.map((expense) => (
                <ListGroup.Item key={expense._id} className="d-flex justify-content-between align-items-center py-3">
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-light p-2 rounded-circle text-primary">
                            <FaMoneyBillWave size={20} />
                        </div>
                        <div>
                            <h6 className="mb-0 fw-bold">{expense.description}</h6>
                            <small className="text-muted d-flex align-items-center gap-1">
                                <FaUser size={10} />
                                <span className="fw-bold">{expense.payer?.name || 'Unknown'}</span> paid ${expense.amount.toFixed(2)}
                            </small>
                            <div className="text-muted small mt-1">
                                <span className="me-1">Splits:</span>
                                {expense.splits.map((split, idx) => (
                                    <Badge bg="secondary" className="me-1 fw-normal text-white" key={idx}>
                                        {split.user?.name}: ${split.amount.toFixed(2)}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="text-end">
                        <h5 className="mb-0 fw-bold text-dark">${expense.amount.toFixed(2)}</h5>
                        <small className="text-muted">{new Date(expense.date).toLocaleDateString()}</small>
                    </div>
                </ListGroup.Item>
            ))}
        </ListGroup>
    );
};

export default ExpenseList;
