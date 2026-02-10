import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { ListGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaHandHoldingUsd, FaArrowRight } from 'react-icons/fa';

const SettlementList = ({ groupId, refreshTrigger }) => {
    const [settlements, setSettlements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSettlements = async () => {
            try {
                const res = await api.get(`/groups/${groupId}/settlements`);
                if (res.data.success) {
                    setSettlements(res.data.data);
                }
            } catch (err) {
                setError('Failed to load settlements');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchSettlements();
    }, [groupId, refreshTrigger]);

    if (loading) return <div className="text-center py-4"><Spinner animation="border" variant="success" size="sm" /></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;
    if (settlements.length === 0) return <div className="text-center py-4 text-muted">No settlements recorded.</div>;

    return (
        <ListGroup variant="flush">
            {settlements.map((settlement) => (
                <ListGroup.Item key={settlement._id} className="d-flex justify-content-between align-items-center py-3">
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-light p-2 rounded-circle text-success" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FaHandHoldingUsd size={20} />
                        </div>
                        <div>
                            <div className="d-flex align-items-center gap-2">
                                <span className="fw-bold">{settlement.payer.name}</span>
                                <FaArrowRight className="text-muted small" />
                                <span className="fw-bold">{settlement.payee.name}</span>
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
    );
};

export default SettlementList;
