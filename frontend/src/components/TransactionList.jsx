import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { ListGroup, Badge, Spinner, Alert, Button, ButtonGroup } from 'react-bootstrap';
import { FaMoneyBillWave, FaHandHoldingUsd, FaHistory, FaFilter } from 'react-icons/fa';

const TransactionList = ({ groupId, refreshTrigger }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); // all, expense, settlement

    useEffect(() => {
        const fetchHistory = async () => {
            // setLoading(true); // avoiding flash
            try {
                const res = await api.get(`/groups/${groupId}/transactions`);
                if (res.data.success) {
                    setTransactions(res.data.data);
                }
            } catch (err) {
                setError('Failed to load history');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [groupId, refreshTrigger]);

    const filteredTransactions = transactions.filter(t => {
        if (filter === 'all') return true;
        return t.type.toLowerCase() === filter;
    });

    if (loading) return <div className="text-center py-4"><Spinner animation="border" variant="primary" size="sm" /></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;
    if (transactions.length === 0) return <div className="text-center py-4 text-muted">No activity yet.</div>;

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="text-muted fw-bold mb-0">Recent Activity</h6>
                <ButtonGroup size="sm">
                    <Button variant={filter === 'all' ? 'primary' : 'outline-primary'} onClick={() => setFilter('all')}>All</Button>
                    <Button variant={filter === 'expense' ? 'primary' : 'outline-primary'} onClick={() => setFilter('expense')}>Expenses</Button>
                    <Button variant={filter === 'settlement' ? 'primary' : 'outline-primary'} onClick={() => setFilter('settlement')}>Settlements</Button>
                </ButtonGroup>
            </div>

            {filteredTransactions.length === 0 && (
                <div className="text-center py-4 text-muted font-italic">No transactions found for this filter.</div>
            )}

            <ListGroup variant="flush">
                {filteredTransactions.map((t) => {
                    const type = t.type.toLowerCase();
                    const isExpense = type === 'expense';
                    const Icon = isExpense ? FaMoneyBillWave : FaHandHoldingUsd;
                    const colorClass = isExpense ? 'text-danger' : 'text-success';
                    // const bgClass = isExpense ? 'bg-danger-subtle' : 'bg-success-subtle'; 

                    return (
                        <ListGroup.Item key={t._id} className="d-flex justify-content-between align-items-center py-3">
                            <div className="d-flex align-items-center gap-3">
                                <div className={`p-2 rounded-circle ${colorClass} bg-light`} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon size={18} />
                                </div>
                                <div>
                                    <h6 className="mb-0 fw-bold">{t.description}</h6>
                                    <small className="text-muted">
                                        {isExpense ? (
                                            <>
                                                <span className="fw-bold">{t.payer?.name || 'Unknown'}</span> paid
                                            </>
                                        ) : (
                                            <>
                                                <span className="fw-bold">{t.payer?.name || 'Unknown'}</span> paid <span className="fw-bold">{t.details?.payee?.name || 'Unknown'}</span>
                                            </>
                                        )}
                                        <span className="mx-2">•</span>
                                        {new Date(t.date).toLocaleDateString()}
                                    </small>
                                </div>
                            </div>
                            <div className={`fw-bold ${colorClass}`}>
                                {isExpense ? '-' : '+'}${t.amount.toFixed(2)}
                            </div>
                        </ListGroup.Item>
                    );
                })}
            </ListGroup>
        </div>
    );
};

export default TransactionList;
