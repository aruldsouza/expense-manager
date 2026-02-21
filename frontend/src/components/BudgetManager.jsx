import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
    Card, Button, Badge, ProgressBar, Form, InputGroup, Alert,
    Spinner, Modal, Row, Col
} from 'react-bootstrap';
import { FaPlus, FaTrash, FaEdit, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { useCurrency } from '../context/CurrencyContext';

const CATEGORIES = ['Food', 'Travel', 'Utilities', 'Rent', 'Entertainment', 'Shopping', 'Health', 'Transport', 'Other', 'Custom'];

const CATEGORY_ICONS = {
    Food: '🍔', Travel: '✈️', Utilities: '💡', Rent: '🏠',
    Entertainment: '🎬', Shopping: '🛍️', Health: '🏥',
    Transport: '🚗', Other: '📦', Custom: '⭐'
};

const CATEGORY_COLORS = {
    Food: '#ef4444', Travel: '#3b82f6', Utilities: '#f59e0b', Rent: '#8b5cf6',
    Entertainment: '#ec4899', Shopping: '#06b6d4', Health: '#10b981',
    Transport: '#6366f1', Other: '#6b7280', Custom: '#f97316'
};

const BudgetManager = ({ groupId, groupCurrency, refreshTrigger, currentUserRole = 'Member' }) => {
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);
    const [formCategory, setFormCategory] = useState('Food');
    const [formLimit, setFormLimit] = useState('');
    const [saving, setSaving] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const { formatCurrency } = useCurrency();
    const gc = groupCurrency || 'USD';

    const fetchBudgets = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/groups/${groupId}/analytics/budget-status`, {
                params: { month: selectedMonth }
            });
            if (res.data.success) setBudgets(res.data.data);
        } catch {
            setError('Failed to load budgets');
        } finally {
            setLoading(false);
        }
    }, [groupId, selectedMonth, refreshTrigger]);

    useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

    const openAdd = () => {
        setEditingBudget(null);
        setFormCategory('Food');
        setFormLimit('');
        setShowAddModal(true);
    };

    const openEdit = (budget) => {
        setEditingBudget(budget);
        setFormCategory(budget.category);
        setFormLimit(String(budget.limit));
        setShowAddModal(true);
    };

    const handleSave = async () => {
        if (!formLimit || parseFloat(formLimit) <= 0) return;
        setSaving(true);
        try {
            if (editingBudget) {
                await api.put(`/groups/${groupId}/budgets/${editingBudget._id}`, { limit: parseFloat(formLimit) });
            } else {
                await api.post(`/groups/${groupId}/budgets`, {
                    category: formCategory,
                    limit: parseFloat(formLimit),
                    monthYear: selectedMonth
                });
            }
            setShowAddModal(false);
            fetchBudgets();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save budget');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this budget?')) return;
        try {
            await api.delete(`/groups/${groupId}/budgets/${id}`);
            fetchBudgets();
        } catch { setError('Failed to delete budget'); }
    };

    const anyExceeded = budgets.some(b => b.exceeded);

    return (
        <div className="p-3">
            {/* Controls row */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                    <Form.Control
                        type="month"
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        style={{ width: 'auto' }}
                        size="sm"
                    />
                </div>
                {currentUserRole !== 'Viewer' && (
                    <Button size="sm" className="btn-modern-primary d-flex align-items-center gap-2 rounded-pill px-3" onClick={openAdd}>
                        <FaPlus /> Set Budget
                    </Button>
                )}
            </div>

            {anyExceeded && (
                <Alert variant="danger" className="d-flex align-items-center gap-2 mb-3">
                    <FaExclamationTriangle /> Some budgets have been exceeded this month!
                </Alert>
            )}

            {error && <Alert variant="danger">{error}</Alert>}
            {loading ? (
                <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
            ) : budgets.length === 0 ? (
                <div className="text-center py-5 text-muted">
                    <div style={{ fontSize: '3rem' }}>💰</div>
                    <p className="mt-2">No budgets set for this month.</p>
                    {currentUserRole !== 'Viewer' && (
                        <Button variant="outline-primary" size="sm" onClick={openAdd}>Set your first budget</Button>
                    )}
                </div>
            ) : (
                <Row xs={1} md={2} lg={3} className="g-3">
                    {budgets.map(b => {
                        const color = CATEGORY_COLORS[b.category] || '#6b7280';
                        const barVariant = b.exceeded ? 'danger' : b.percentUsed >= 80 ? 'warning' : 'success';
                        return (
                            <Col key={b._id}>
                                <Card className="h-100 border-0 shadow-sm">
                                    <Card.Body>
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div className="d-flex align-items-center gap-2">
                                                <span style={{ fontSize: '1.5rem' }}>{CATEGORY_ICONS[b.category] || '📦'}</span>
                                                <div>
                                                    <h6 className="mb-0 fw-bold">{b.category}</h6>
                                                    {b.exceeded ? (
                                                        <Badge bg="danger" className="small"><FaExclamationTriangle className="me-1" />Exceeded</Badge>
                                                    ) : b.percentUsed >= 80 ? (
                                                        <Badge bg="warning" text="dark" className="small">Near limit</Badge>
                                                    ) : (
                                                        <Badge bg="success" className="small"><FaCheckCircle className="me-1" />OK</Badge>
                                                    )}
                                                </div>
                                            </div>
                                            {currentUserRole !== 'Viewer' && (
                                                <div className="d-flex gap-1">
                                                    <Button variant="outline-secondary" size="sm" onClick={() => openEdit(b)}><FaEdit /></Button>
                                                    <Button variant="outline-danger" size="sm" onClick={() => handleDelete(b._id)}><FaTrash /></Button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-3">
                                            <div className="d-flex justify-content-between small text-muted mb-1">
                                                <span>Spent</span>
                                                <span className={b.exceeded ? 'text-danger fw-bold' : ''}>
                                                    {formatCurrency(b.spent, gc)} / {formatCurrency(b.limit, gc)}
                                                </span>
                                            </div>
                                            <ProgressBar
                                                now={Math.min(b.percentUsed, 100)}
                                                variant={barVariant}
                                                style={{ height: '8px', borderRadius: '4px' }}
                                            />
                                            <div className="d-flex justify-content-between small mt-1">
                                                <span className="text-muted">{b.percentUsed}% used</span>
                                                <span className={b.remaining < 0 ? 'text-danger fw-bold' : 'text-success fw-bold'}>
                                                    {b.remaining < 0 ? `Over by ${formatCurrency(Math.abs(b.remaining), gc)}` : `${formatCurrency(b.remaining, gc)} left`}
                                                </span>
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            )}

            {/* Add / Edit Modal */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold">
                        {editingBudget ? `Edit Budget — ${editingBudget.category}` : '💰 Set Budget'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {!editingBudget && (
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">Category</Form.Label>
                            <Form.Select value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                                {CATEGORIES.map(c => (
                                    <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    )}
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold">Monthly Limit ({gc})</Form.Label>
                        <InputGroup>
                            <InputGroup.Text>💰</InputGroup.Text>
                            <Form.Control
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder="e.g. 500.00"
                                value={formLimit}
                                onChange={e => setFormLimit(e.target.value)}
                                autoFocus
                            />
                        </InputGroup>
                    </Form.Group>
                    {!editingBudget && (
                        <Form.Group>
                            <Form.Label className="fw-bold">Month</Form.Label>
                            <Form.Control type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
                        </Form.Group>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" onClick={() => setShowAddModal(false)}>Cancel</Button>
                    <Button className="btn-modern-primary" onClick={handleSave} disabled={saving || !formLimit}>
                        {saving ? <Spinner size="sm" /> : editingBudget ? 'Update' : 'Save Budget'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default BudgetManager;
