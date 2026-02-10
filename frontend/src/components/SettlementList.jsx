import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { ListGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaHandHoldingUsd, FaArrowRight } from 'react-icons/fa';

const SettlementList = ({ groupId, refreshTrigger, onSettle }) => {
    const [settlements, setSettlements] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [settlementRes, optimizedRes] = await Promise.all([
                    api.get(`/groups/${groupId}/settlements`),
                    api.get(`/groups/${groupId}/settlements/optimized`)
                ]);

                if (settlementRes.data.success) {
                    setSettlements(settlementRes.data.data);
                }
                if (optimizedRes.data.success) {
                    setRecommendations(optimizedRes.data.data);
                }
            } catch (err) {
                setError('Failed to load settlement data');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [groupId, refreshTrigger]);

    if (loading) return <div className="text-center py-4"><Spinner animation="border" variant="success" size="sm" /></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;

    return (
        <div className="animate-fade-in">
            {/* Suggested Settlements Section */}
            {recommendations.length > 0 && (
                <div className="mb-4">
                    <h6 className="text-uppercase text-muted fw-bold small mb-3">Suggested Payments</h6>
                    <ListGroup variant="flush" className="rounded-3 shadow-sm overflow-hidden">
                        {recommendations.map((rec, index) => {
                            if (!rec.from || !rec.to) return null;
                            return (
                                <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center py-3 bg-success bg-opacity-10 border-success border-opacity-25">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="bg-success text-white p-2 rounded-circle" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FaArrowRight size={16} transform="rotate(-45)" />
                                        </div>
                                        <div>
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="fw-bold text-dark">{rec.from?.name || 'Unknown'}</span>
                                                <span className="text-muted small">owes</span>
                                                <span className="fw-bold text-dark">{rec.to?.name || 'Unknown'}</span>
                                            </div>
                                            <div className="fw-bold text-success">${rec.amount.toFixed(2)}</div>
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-sm btn-modern-primary fw-bold px-3 shadow-sm"
                                        onClick={() => onSettle(rec)}
                                    >
                                        Settle
                                    </button>
                                </ListGroup.Item>
                            )
                        })}
                    </ListGroup>
                </div>
            )}

            {/* Past Settlements */}
            <h6 className="text-uppercase text-muted fw-bold small mb-3">History</h6>
            {settlements.length === 0 ? (
                <div className="text-center py-4 text-muted glass-card">No past settlements recorded.</div>
            ) : (
                <ListGroup variant="flush" className="glass-card">
                    {settlements.map((settlement) => (
                        <ListGroup.Item key={settlement._id} className="d-flex justify-content-between align-items-center py-3 bg-transparent">
                            <div className="d-flex align-items-center gap-3">
                                <div className="bg-light p-2 rounded-circle text-success" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FaHandHoldingUsd size={20} />
                                </div>
                                <div>
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="fw-bold">{settlement.payer?.name || 'Unknown'}</span>
                                        <FaArrowRight className="text-muted small" />
                                        <span className="fw-bold">{settlement.payee?.name || 'Unknown'}</span>
                                    </div>
                                    <small className="text-muted">
                                        {new Date(settlement.date).toLocaleDateString()}
                                    </small>
                                </div>
                            </div>
                            <div className="text-end">
                                <span className="fw-bold text-success fs-5">
                                    ${settlement.amount.toFixed(2)}
                                </span>
                            </div>
                        </ListGroup.Item>
                    ))}
                </ListGroup>
            )}
        </div>
    );
};

export default SettlementList;
