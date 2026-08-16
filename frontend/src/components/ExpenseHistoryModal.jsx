import React, { useEffect, useState } from 'react';
import { Modal, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { FaHistory, FaArrowRight, FaUserEdit, FaClock } from 'react-icons/fa';
import api from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { formatDistanceToNow } from 'date-fns';

const ExpenseHistoryModal = ({ show, onHide, expenseId, groupId, groupCurrency }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { formatCurrency } = useCurrency();

    useEffect(() => {
        if (!show || !expenseId) return;

        const fetchHistory = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/groups/${groupId}/expenses/${expenseId}/history`);
                setHistory(res.data.data);
            } catch (err) {
                setError('Failed to load expense history');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [show, expenseId, groupId]);

    const renderChange = (key, oldVal, newVal) => {
        let oldDisplay = oldVal;
        let newDisplay = newVal;

        if (key === 'amount') {
            oldDisplay = formatCurrency(oldVal, groupCurrency);
            newDisplay = formatCurrency(newVal, groupCurrency);
        } else if (key === 'splits') {
            return (
                <div key={key} className="mb-2">
                    <strong>Splits updated</strong>
                </div>
            );
        }

        if (oldDisplay === newDisplay) return null; // No change

        return (
            <div key={key} className="mb-1 d-flex gap-2 align-items-center flex-wrap">
                <Badge bg="secondary" className="text-capitalize">{key}</Badge>
                <del className="text-muted small">{oldDisplay}</del>
                <FaArrowRight size={10} className="text-muted" />
                <span className="text-success small fw-bold">{newDisplay}</span>
            </div>
        );
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton className="border-0 pb-0">
                <Modal.Title className="fw-bold text-secondary">
                    <FaHistory className="me-2" />
                    Edit History
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {loading ? (
                    <div className="text-center py-4"><Spinner animation="border" variant="secondary" /></div>
                ) : error ? (
                    <Alert variant="danger">{error}</Alert>
                ) : history.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                        <FaHistory size={40} className="mb-3 opacity-50" />
                        <p>No edits have been made to this expense yet.</p>
                    </div>
                ) : (
                    <div className="history-timeline">
                        {history.map((record, idx) => (
                            <div key={record._id} className="mb-4 pb-3 border-bottom position-relative">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div className="fw-bold text-dark d-flex align-items-center gap-2">
                                        <FaUserEdit className="text-primary" />
                                        {record.editedBy?.name || 'Unknown User'}
                                    </div>
                                    <div className="small text-muted d-flex align-items-center gap-1">
                                        <FaClock size={10} />
                                        {formatDistanceToNow(new Date(record.createdAt), { addSuffix: true })}
                                    </div>
                                </div>
                                <div className="bg-light p-3 rounded mt-2">
                                    {Object.keys(record.newValues).map(key =>
                                        renderChange(key, record.oldValues[key], record.newValues[key])
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer className="border-0 pt-0">
                <Button variant="light" onClick={onHide}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ExpenseHistoryModal;
