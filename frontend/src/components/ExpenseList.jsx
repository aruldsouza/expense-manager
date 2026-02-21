import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { ListGroup, Badge, Spinner, Alert, Modal, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaMoneyBillWave, FaUser, FaExchangeAlt, FaPaperclip, FaTrash, FaExternalLinkAlt, FaEdit, FaHistory } from 'react-icons/fa';
import { useCurrency } from '../context/CurrencyContext';
import AddExpense from './AddExpense';
import ExpenseHistoryModal from './ExpenseHistoryModal';

const CATEGORY_ICONS = {
    Food: '🍔', Travel: '✈️', Utilities: '💡', Rent: '🏠',
    Entertainment: '🎬', Shopping: '🛍️', Health: '🏥',
    Transport: '🚗', Other: '📦', Custom: '⭐'
};

const ExpenseList = ({ groupId, groupCurrency, refreshTrigger, groupMembers, currentUserRole = 'Member' }) => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { displayCurrency, formatCurrency, convertAmount } = useCurrency();
    const [convertedAmounts, setConvertedAmounts] = useState({});
    const [receiptModal, setReceiptModal] = useState(null); // { url, isPdf }
    const [deletingReceipt, setDeletingReceipt] = useState(null); // expense id being processed
    const [editExpenseData, setEditExpenseData] = useState(null);
    const [showHistoryFor, setShowHistoryFor] = useState(null);

    const gc = groupCurrency || 'USD';
    const needsConversion = displayCurrency && displayCurrency !== gc;

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

    useEffect(() => { fetchExpenses(); }, [groupId, refreshTrigger]);

    // Convert amounts for dual-currency display
    useEffect(() => {
        if (!needsConversion || expenses.length === 0) { setConvertedAmounts({}); return; }
        let cancelled = false;
        const doConvert = async () => {
            const result = {};
            await Promise.all(expenses.map(async (exp) => {
                try { result[exp._id] = await convertAmount(exp.amount, gc, displayCurrency); }
                catch { result[exp._id] = null; }
            }));
            if (!cancelled) setConvertedAmounts(result);
        };
        doConvert();
        return () => { cancelled = true; };
    }, [expenses, gc, displayCurrency, needsConversion, convertAmount]);

    const handleDeleteReceipt = async (expenseId) => {
        if (!window.confirm('Delete this receipt? This cannot be undone.')) return;
        setDeletingReceipt(expenseId);
        try {
            const res = await api.delete(`/groups/${groupId}/expenses/${expenseId}/receipt`);
            if (res.data.success) {
                setExpenses(prev => prev.map(e => e._id === expenseId
                    ? { ...e, receiptUrl: null, receiptPublicId: null }
                    : e
                ));
                setReceiptModal(null);
            }
        } catch { setError('Failed to delete receipt'); }
        finally { setDeletingReceipt(null); }
    };

    const handleDeleteExpense = async (expenseId) => {
        if (!window.confirm('Delete this expense entirely? This cannot be undone.')) return;
        try {
            const res = await api.delete(`/groups/${groupId}/expenses/${expenseId}`);
            if (res.data.success) {
                setExpenses(prev => prev.filter(e => e._id !== expenseId));
            }
        } catch { setError('Failed to delete expense'); }
    };

    if (loading) return <div className="text-center py-4"><Spinner animation="border" variant="primary" size="sm" /></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;
    if (expenses.length === 0) return <div className="text-center py-4 text-muted">No expenses recorded yet.</div>;

    return (
        <>
            <ListGroup variant="flush">
                {expenses.map((expense) => {
                    const converted = convertedAmounts[expense._id];
                    const isPdf = expense.receiptUrl && expense.receiptUrl.toLowerCase().includes('.pdf');

                    return (
                        <ListGroup.Item key={expense._id} className="d-flex justify-content-between align-items-center py-3">
                            <div className="d-flex align-items-center gap-3">
                                <div className="bg-light p-2 rounded-circle text-primary">
                                    <FaMoneyBillWave size={20} />
                                </div>
                                <div>
                                    <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                                        {expense.description}
                                        {expense.category && expense.category !== 'Other' && (
                                            <span className="small">{CATEGORY_ICONS[expense.category] || '📦'}</span>
                                        )}
                                        {/* Receipt indicator */}
                                        {expense.receiptUrl && (
                                            <OverlayTrigger placement="top" overlay={<Tooltip>View Receipt</Tooltip>}>
                                                <Button
                                                    variant="outline-secondary"
                                                    size="sm"
                                                    className="py-0 px-1 border-0"
                                                    onClick={() => setReceiptModal({ url: expense.receiptUrl, isPdf, expenseId: expense._id })}
                                                >
                                                    <FaPaperclip size={12} />
                                                </Button>
                                            </OverlayTrigger>
                                        )}
                                    </h6>
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
                                {needsConversion && converted != null && (
                                    <OverlayTrigger placement="top" overlay={<Tooltip>≈ in {displayCurrency}</Tooltip>}>
                                        <small className="text-muted d-flex align-items-center justify-content-end gap-1 mt-1">
                                            <FaExchangeAlt size={9} />
                                            ≈ {formatCurrency(converted, displayCurrency)}
                                        </small>
                                    </OverlayTrigger>
                                )}
                                <small className="text-muted d-block">{new Date(expense.date).toLocaleDateString()}</small>
                                <div className="d-flex gap-1 justify-content-end mt-2">
                                    <Button variant="outline-info" size="sm" className="py-0 px-2 border-0" onClick={() => setShowHistoryFor(expense._id)}>
                                        <FaHistory size={12} />
                                    </Button>
                                    {currentUserRole !== 'Viewer' && (
                                        <>
                                            <Button variant="outline-secondary" size="sm" className="py-0 px-2 border-0" onClick={() => setEditExpenseData(expense)}>
                                                <FaEdit size={12} />
                                            </Button>
                                            <Button variant="outline-danger" size="sm" className="py-0 px-2 border-0" onClick={() => handleDeleteExpense(expense._id)}>
                                                <FaTrash size={12} />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </ListGroup.Item>
                    );
                })}
            </ListGroup>

            {/* Receipt Preview Modal */}
            <Modal
                show={!!receiptModal}
                onHide={() => setReceiptModal(null)}
                centered
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold">
                        <FaPaperclip className="me-2 text-secondary" />Receipt
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center p-3">
                    {receiptModal?.isPdf ? (
                        <div className="py-4">
                            <div style={{ fontSize: '4rem' }}>📄</div>
                            <p className="text-muted mt-2">PDF receipt</p>
                            <Button
                                variant="primary"
                                href={receiptModal.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="d-inline-flex align-items-center gap-2"
                            >
                                <FaExternalLinkAlt /> Open PDF
                            </Button>
                        </div>
                    ) : (
                        <img
                            src={receiptModal?.url}
                            alt="Receipt"
                            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }}
                        />
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="outline-danger"
                        size="sm"
                        disabled={deletingReceipt === receiptModal?.expenseId}
                        onClick={() => handleDeleteReceipt(receiptModal.expenseId)}
                        className="d-flex align-items-center gap-2"
                    >
                        {deletingReceipt === receiptModal?.expenseId
                            ? <Spinner size="sm" />
                            : <FaTrash />
                        }
                        Delete Receipt
                    </Button>
                    <Button variant="secondary" onClick={() => setReceiptModal(null)}>Close</Button>
                </Modal.Footer>
            </Modal>

            {/* Edit Expense Modal */}
            <Modal show={!!editExpenseData} onHide={() => setEditExpenseData(null)} centered size="lg">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold text-primary"><FaEdit className="me-2" />Edit Expense</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0">
                    {editExpenseData && (
                        <AddExpense
                            groupId={groupId}
                            groupMembers={groupMembers}
                            initialData={editExpenseData}
                            onSuccess={() => { setEditExpenseData(null); fetchExpenses(); }}
                            onCancel={() => setEditExpenseData(null)}
                        />
                    )}
                </Modal.Body>
            </Modal>

            {/* Expense History Modal */}
            <ExpenseHistoryModal
                show={!!showHistoryFor}
                onHide={() => setShowHistoryFor(null)}
                expenseId={showHistoryFor}
                groupId={groupId}
                groupCurrency={groupCurrency}
            />
        </>
    );
};

export default ExpenseList;
