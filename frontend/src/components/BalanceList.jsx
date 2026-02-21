import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { ListGroup, Badge, Spinner, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaUser, FaExchangeAlt } from 'react-icons/fa';
import { useCurrency } from '../context/CurrencyContext';

const BalanceList = ({ groupId, groupCurrency, refreshTrigger }) => {
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { displayCurrency, formatCurrency } = useCurrency();

    useEffect(() => {
        const fetchBalances = async () => {
            setLoading(true);
            try {
                // Always pass convertTo so we get both native + converted in one call
                const params = displayCurrency && displayCurrency !== (groupCurrency || 'USD')
                    ? { convertTo: displayCurrency }
                    : {};
                const res = await api.get(`/groups/${groupId}/balances`, { params });
                if (res.data.success) setBalances(res.data.data);
            } catch {
                setError('Failed to load balances');
            } finally {
                setLoading(false);
            }
        };
        fetchBalances();
    }, [groupId, groupCurrency, displayCurrency, refreshTrigger]);

    if (loading) return <div className="text-center py-4"><Spinner animation="border" variant="primary" size="sm" /></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;

    const sortedBalances = [...balances].sort((a, b) => b.balance - a.balance);
    const gc = groupCurrency || 'USD';
    const needsConversion = displayCurrency && displayCurrency !== gc;

    return (
        <ListGroup variant="flush">
            {sortedBalances.map((item) => {
                const bal = item.balance;
                const user = item.user;
                const isOwed = bal > 0;
                const isSettled = Math.abs(bal) < 0.01;
                if (!user) return null;

                const variant = isSettled ? 'secondary' : isOwed ? 'success' : 'danger';
                const textClass = isSettled ? 'text-muted' : isOwed ? 'text-success' : 'text-danger';
                const label = isSettled ? 'Settled' : isOwed ? 'Gets back' : 'Owes';

                return (
                    <ListGroup.Item key={user._id} className="d-flex justify-content-between align-items-center py-3">
                        <div className="d-flex align-items-center gap-3">
                            <div className="rounded-circle d-flex align-items-center justify-content-center bg-light text-secondary" style={{ width: '40px', height: '40px' }}>
                                <span className="fw-bold fs-5">{user.name ? user.name.charAt(0).toUpperCase() : '?'}</span>
                            </div>
                            <div>
                                <h6 className="mb-0 fw-bold">{user.name || 'Unknown'}</h6>
                                <small className="text-muted d-flex align-items-center gap-1">
                                    <FaUser size={10} /> {user.email}
                                </small>
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
                                    {/* Native currency (group base) */}
                                    <span className={`fw-bold fs-5 ${textClass}`}>
                                        {formatCurrency(Math.abs(bal), gc)}
                                    </span>
                                    {/* Converted amount in display currency */}
                                    {needsConversion && item.convertedBalance != null && (
                                        <OverlayTrigger placement="top" overlay={<Tooltip>≈ in {displayCurrency}</Tooltip>}>
                                            <div className="d-flex align-items-center justify-content-end gap-1 mt-1">
                                                <FaExchangeAlt size={9} className="text-muted" />
                                                <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                    ≈ {formatCurrency(Math.abs(item.convertedBalance), displayCurrency)}
                                                </small>
                                            </div>
                                        </OverlayTrigger>
                                    )}
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
