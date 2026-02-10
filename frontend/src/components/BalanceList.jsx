import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { ListGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaUser } from 'react-icons/fa';

const BalanceList = ({ groupId, refreshTrigger }) => {
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchBalances = async () => {
            try {
                const res = await api.get(`/groups/${groupId}/balances`);
                if (res.data.success) {
                    setBalances(res.data.data);
                }
            } catch (err) {
                setError('Failed to load balances');
            } finally {
                setLoading(false);
            }
        };

        fetchBalances();
    }, [groupId, refreshTrigger]);

    if (loading) return <div className="text-center py-4"><Spinner animation="border" variant="primary" size="sm" /></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;

    const sortedBalances = [...balances].sort((a, b) => b.balance - a.balance);

    return (
        <ListGroup variant="flush">
            {sortedBalances.map((userBalance) => {
                const bal = userBalance.balance;
                const user = userBalance.user;
                const isOwed = bal > 0;
                const isSettled = Math.abs(bal) < 0.01;

                if (!user) return null;

                let variant = 'secondary';
                let textClass = 'text-muted';
                let label = 'Settled';
                let sign = '';

                if (isOwed) {
                    variant = 'success';
                    textClass = 'text-success';
                    label = 'Gets back';
                    sign = '+';
                } else if (!isSettled) {
                    variant = 'danger';
                    textClass = 'text-danger';
                    label = 'Owes';
                    sign = '-'; // or just empty if we use abs, but usually owe is negative
                }

                return (
                    <ListGroup.Item key={user._id} className="d-flex justify-content-between align-items-center py-3">
                        <div className="d-flex align-items-center gap-3">
                            <div className={`rounded-circle d-flex align-items-center justify-content-center bg-light text-secondary`} style={{ width: '40px', height: '40px' }}>
                                <span className="fw-bold fs-5">{user.name ? user.name.charAt(0).toUpperCase() : '?'}</span>
                            </div>
                            <div>
                                <h6 className="mb-0 fw-bold">{user.name || 'Unknown'}</h6>
                            </div>
                        </div>

                        <div className="text-end">
                            {isSettled ? (
                                <Badge bg="light" text="dark" className="border">Settled up</Badge>
                            ) : (
                                <div>
                                    <small className="text-uppercase fw-bold d-block" style={{ fontSize: '0.7rem', color: isOwed ? '#198754' : '#dc3545' }}>
                                        {label}
                                    </small>
                                    <span className={`fw-bold fs-5 ${textClass}`}>
                                        ${Math.abs(bal).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </ListGroup.Item>
                );
            })}
        </ListGroup>
    );
};

export default BalanceList;
