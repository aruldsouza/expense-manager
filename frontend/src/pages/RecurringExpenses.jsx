import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
    Container, Row, Col, Card, Badge, Button, Spinner, Alert, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import {
    FaPlay, FaPause, FaTrash, FaPlus, FaSync, FaClock, FaUser, FaExclamationCircle
} from 'react-icons/fa';
import {
    getRecurringExpenses,
    pauseRecurringExpense,
    resumeRecurringExpense,
    deleteRecurringExpense
} from '../services/api';
import api from '../services/api';
import AddRecurringExpense from '../components/AddRecurringExpense';

const FREQ_LABELS = {
    daily: '📅 Daily',
    weekly: '📆 Weekly',
    monthly: '🗓️ Monthly',
    custom: '⚙️ Custom',
};

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const RecurringExpenses = () => {
    const { groupId } = useParams();
    const [recurring, setRecurring] = useState([]);
    const [groupMembers, setGroupMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(null); // id of item being actioned

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [recRes, grpRes] = await Promise.all([
                getRecurringExpenses(groupId),
                api.get(`/groups/${groupId}`)
            ]);
            setRecurring(recRes.data.data);
            setGroupMembers(grpRes.data.data?.members || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load recurring expenses');
        } finally {
            setLoading(false);
        }
    }, [groupId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handlePause = async (id) => {
        setActionLoading(id);
        try {
            await pauseRecurringExpense(groupId, id);
            setRecurring(prev => prev.map(r => r._id === id ? { ...r, status: 'paused' } : r));
        } catch {
            setError('Failed to pause.');
        } finally { setActionLoading(null); }
    };

    const handleResume = async (id) => {
        setActionLoading(id);
        try {
            await resumeRecurringExpense(groupId, id);
            setRecurring(prev => prev.map(r => r._id === id ? { ...r, status: 'active' } : r));
        } catch {
            setError('Failed to resume.');
        } finally { setActionLoading(null); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this recurring expense? This cannot be undone.')) return;
        setActionLoading(id);
        try {
            await deleteRecurringExpense(groupId, id);
            setRecurring(prev => prev.filter(r => r._id !== id));
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete.');
        } finally { setActionLoading(null); }
    };

    return (
        <Container className="py-4">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold mb-1">🔁 Recurring Expenses</h2>
                    <p className="text-muted mb-0">Auto-scheduled expenses that repeat on your chosen frequency</p>
                </div>
                <div className="d-flex gap-2">
                    <Button variant="outline-secondary" onClick={fetchData} title="Refresh">
                        <FaSync />
                    </Button>
                    <Button variant="primary" onClick={() => setShowModal(true)}>
                        <FaPlus className="me-2" />New Recurring
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                    <FaExclamationCircle className="me-2" />{error}
                </Alert>
            )}

            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3 text-muted">Loading recurring expenses…</p>
                </div>
            ) : recurring.length === 0 ? (
                <div className="text-center py-5">
                    <div style={{ fontSize: '4rem' }}>🔁</div>
                    <h5 className="mt-3 text-muted">No recurring expenses yet</h5>
                    <p className="text-muted small">Set up automatic expenses like rent or subscriptions.</p>
                    <Button variant="primary" className="mt-2" onClick={() => setShowModal(true)}>
                        <FaPlus className="me-2" />Create First Recurring Expense
                    </Button>
                </div>
            ) : (
                <Row xs={1} md={2} lg={3} className="g-4">
                    {recurring.map(item => {
                        const isActioning = actionLoading === item._id;
                        const isPaused = item.status === 'paused';
                        return (
                            <Col key={item._id}>
                                <Card className="h-100 shadow-sm border-0" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                                    {/* Color bar */}
                                    <div style={{
                                        height: '4px',
                                        background: isPaused
                                            ? 'linear-gradient(90deg, #adb5bd, #ced4da)'
                                            : 'linear-gradient(90deg, #4f46e5, #7c3aed)'
                                    }} />
                                    <Card.Body className="p-4">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <h5 className="fw-bold mb-0" style={{ lineHeight: 1.3 }}>
                                                {item.description}
                                            </h5>
                                            <Badge
                                                bg={isPaused ? 'secondary' : 'success'}
                                                className="ms-2 rounded-pill"
                                                style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}
                                            >
                                                {isPaused ? '⏸ Paused' : '▶ Active'}
                                            </Badge>
                                        </div>

                                        <div className="display-6 fw-bold text-primary mb-3">
                                            ${Number(item.amount).toFixed(2)}
                                        </div>

                                        <div className="d-flex flex-column gap-1 small text-muted mb-3">
                                            <span>
                                                <FaClock className="me-1" />
                                                {FREQ_LABELS[item.frequency]}
                                                {item.frequency === 'custom' && item.cronExpression && (
                                                    <code className="ms-1 text-dark">({item.cronExpression})</code>
                                                )}
                                            </span>
                                            <span>
                                                <FaUser className="me-1" />
                                                Paid by <strong>{item.payer?.name || 'Unknown'}</strong>
                                            </span>
                                            <span>
                                                🗓️ Next run: <strong>{formatDate(item.nextRunAt)}</strong>
                                            </span>
                                            {item.lastGeneratedAt && (
                                                <span>
                                                    ✅ Last run: {formatDate(item.lastGeneratedAt)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Split info */}
                                        <div className="mb-3">
                                            <Badge bg="light" text="dark" className="border">{item.splitType} split</Badge>
                                            {item.splits?.length > 0 && (
                                                <span className="small text-muted ms-2">
                                                    among {item.splits.length} member{item.splits.length > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="d-flex gap-2">
                                            <OverlayTrigger placement="top" overlay={<Tooltip>{isPaused ? 'Resume' : 'Pause'}</Tooltip>}>
                                                <Button
                                                    variant={isPaused ? 'outline-success' : 'outline-warning'}
                                                    size="sm"
                                                    className="flex-grow-1"
                                                    onClick={() => isPaused ? handleResume(item._id) : handlePause(item._id)}
                                                    disabled={isActioning}
                                                >
                                                    {isActioning
                                                        ? <Spinner size="sm" />
                                                        : isPaused ? <><FaPlay className="me-1" />Resume</> : <><FaPause className="me-1" />Pause</>
                                                    }
                                                </Button>
                                            </OverlayTrigger>

                                            <OverlayTrigger placement="top" overlay={<Tooltip>Delete</Tooltip>}>
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => handleDelete(item._id)}
                                                    disabled={isActioning}
                                                >
                                                    {isActioning ? <Spinner size="sm" /> : <FaTrash />}
                                                </Button>
                                            </OverlayTrigger>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            )}

            {/* Add Recurring Expense Modal */}
            <AddRecurringExpense
                show={showModal}
                onHide={() => setShowModal(false)}
                groupId={groupId}
                groupMembers={groupMembers}
                onSuccess={fetchData}
            />
        </Container>
    );
};

export default RecurringExpenses;
