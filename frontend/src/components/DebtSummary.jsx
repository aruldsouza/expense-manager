import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { Card, Badge, Spinner, Alert, Button, Row, Col, ProgressBar } from 'react-bootstrap';
import {
    FaBalanceScale,
    FaArrowRight,
    FaCheckCircle,
    FaHandHoldingUsd,
    FaMoneyBillWave,
    FaBolt,
    FaRedo,
    FaUser,
    FaInfoCircle,
    FaArrowUp,
    FaArrowDown
} from 'react-icons/fa';
import { useCurrency } from '../context/CurrencyContext';

/**
 * 8️⃣ Reusable Debt Summary Component
 *
 * Displays:
 * 1. High-level group debt & balance metrics
 * 2. Who needs to pay (Debtors)
 * 3. Who needs to receive (Creditors)
 * 4. Each member's net balance breakdown (Paid, Owed, Net Balance)
 * 5. Optimized settlement payment suggestions (Payer -> Receiver with amounts)
 * 6. Optimization efficiency statistics
 *
 * Responsive, glassmorphic, currency-formatted, and resilient.
 */
const DebtSummary = ({
    groupId,
    groupCurrency = 'INR',
    refreshTrigger = 0,
    onSettle = null
}) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { formatCurrency } = useCurrency();
    const gc = groupCurrency || 'INR';

    const fetchSummary = useCallback(async () => {
        if (!groupId) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/groups/${groupId}/settlements/optimized`);
            if (res.data && res.data.success) {
                setData(res.data);
            } else if (res.data) {
                setData(res.data);
            } else {
                throw new Error('Invalid response structure received');
            }
        } catch (err) {
            console.error('Error fetching debt summary:', err);
            setError(err.response?.data?.error || err.message || 'Failed to load debt summary');
        } finally {
            setLoading(false);
        }
    }, [groupId]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary, refreshTrigger]);

    // 8.8 Loading state
    if (loading) {
        return (
            <div className="glass-card text-center py-5 my-3 animate-fade-in">
                <Spinner animation="border" variant="primary" className="mb-3" />
                <div className="text-muted fw-semibold">Calculating optimized group balances...</div>
            </div>
        );
    }

    // 8.8 Error state
    if (error) {
        return (
            <Alert variant="danger" className="glass-card border-danger border-opacity-50 my-3 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                    <FaInfoCircle className="text-danger fs-5" />
                    <span>{error}</span>
                </div>
                <Button variant="outline-danger" size="sm" onClick={fetchSummary} className="d-flex align-items-center gap-1">
                    <FaRedo size={12} /> Retry
                </Button>
            </Alert>
        );
    }

    if (!data) return null;

    const balances = data.balances || [];
    const debtors = data.debtors || [];
    const creditors = data.creditors || [];
    const transactions = data.optimizedTransactions || data.data || [];
    const stats = data.stats || {};
    const totalDebt = data.totalDebtorAmount || 0;
    const isAllSettled = transactions.length === 0 && totalDebt <= 0.01;

    return (
        <div className="debt-summary-container animate-fade-in">
            {/* Header / Optimization Banner */}
            <div className="glass-card mb-4 border border-primary border-opacity-25" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)' }}>
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="badge rounded-pill bg-primary bg-opacity-25 text-primary border border-primary border-opacity-50 px-3 py-1 fw-bold">
                                ⚡ Greedy Optimization
                            </span>
                            {stats.reductionPercentage > 0 && (
                                <Badge bg="success" className="bg-opacity-75 text-white px-2 py-1">
                                    {stats.reductionPercentage}% fewer transactions
                                </Badge>
                            )}
                        </div>
                        <h4 className="fw-bold mb-1" style={{ fontFamily: 'var(--font-display, sans-serif)' }}>
                            Group Debt Summary & Simplification
                        </h4>
                        <p className="text-muted small mb-0">
                            Min-Cash-Flow algorithm simplifies pairwise debts into the minimum number of transactions.
                        </p>
                    </div>

                    <div className="d-flex align-items-center gap-4 flex-wrap">
                        <div className="text-end">
                            <div className="text-muted small">Total Outstanding Debt</div>
                            <div className="fs-4 fw-bold text-primary">{formatCurrency(totalDebt, gc)}</div>
                        </div>
                        <Button variant="outline-light" size="sm" onClick={fetchSummary} className="d-flex align-items-center gap-1 border-secondary">
                            <FaRedo size={12} /> Refresh
                        </Button>
                    </div>
                </div>

                {/* Reduction Stats Bar if available */}
                {stats.originalTransactionsCount > 0 && (
                    <div className="mt-3 pt-3 border-top border-secondary border-opacity-25 d-flex flex-wrap gap-4 text-muted small">
                        <div>Original pairwise debts: <strong className="text-light">{stats.originalTransactionsCount}</strong></div>
                        <div>Optimized payments: <strong className="text-success">{stats.optimizedTransactionsCount}</strong></div>
                        <div>Transactions eliminated: <strong className="text-info">{stats.transactionsSaved}</strong></div>
                    </div>
                )}
            </div>

            {/* 8.8 Empty State: All Settled Up */}
            {isAllSettled ? (
                <div className="glass-card text-center py-5 my-4 border border-success border-opacity-30 bg-success bg-opacity-10">
                    <div className="rounded-circle bg-success text-white d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '64px', height: '64px' }}>
                        <FaCheckCircle size={32} />
                    </div>
                    <h5 className="fw-bold text-success mb-2">🎉 All Settled Up!</h5>
                    <p className="text-muted mb-0" style={{ maxWidth: '460px', margin: '0 auto' }}>
                        Every member in this group is completely squared away with a zero net balance. No pending payments are required.
                    </p>
                </div>
            ) : (
                <>
                    {/* 8.3 & 8.4 Two-Column Summary: Who Needs to Pay vs Who Needs to Receive */}
                    <Row className="g-3 mb-4">
                        {/* Who Needs to Pay (Debtors) */}
                        <Col xs={12} md={6}>
                            <Card className="glass-card h-100 border border-danger border-opacity-25" style={{ background: 'rgba(244, 63, 94, 0.05)' }}>
                                <Card.Body className="p-3">
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="rounded-circle bg-danger bg-opacity-20 text-danger p-2 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                                                <FaArrowUp size={16} />
                                            </div>
                                            <div>
                                                <h6 className="fw-bold mb-0 text-danger">Who Needs to Pay</h6>
                                                <small className="text-muted">{debtors.length} {debtors.length === 1 ? 'member owes' : 'members owe'}</small>
                                            </div>
                                        </div>
                                        <Badge bg="danger" className="bg-opacity-25 text-danger border border-danger border-opacity-50 px-2 py-1">
                                            {formatCurrency(totalDebt, gc)}
                                        </Badge>
                                    </div>

                                    {debtors.length === 0 ? (
                                        <div className="text-muted small text-center py-3">No members owe money</div>
                                    ) : (
                                        <div className="d-flex flex-column gap-2">
                                            {debtors.map((d, idx) => {
                                                const pct = totalDebt > 0 ? Math.round((d.amount / totalDebt) * 100) : 0;
                                                return (
                                                    <div key={idx} className="p-2 rounded bg-black bg-opacity-25 border border-secondary border-opacity-25">
                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div className="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '28px', height: '28px', fontSize: '12px' }}>
                                                                    {(d.user?.name || '?').charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="fw-semibold text-light small">{d.user?.name || 'Unknown'}</span>
                                                            </div>
                                                            <span className="fw-bold text-danger">{formatCurrency(d.amount, gc)}</span>
                                                        </div>
                                                        <ProgressBar now={pct} variant="danger" style={{ height: '4px' }} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Who Needs to Receive (Creditors) */}
                        <Col xs={12} md={6}>
                            <Card className="glass-card h-100 border border-success border-opacity-25" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                                <Card.Body className="p-3">
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="rounded-circle bg-success bg-opacity-20 text-success p-2 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                                                <FaArrowDown size={16} />
                                            </div>
                                            <div>
                                                <h6 className="fw-bold mb-0 text-success">Who Needs to Receive</h6>
                                                <small className="text-muted">{creditors.length} {creditors.length === 1 ? 'member receives' : 'members receive'}</small>
                                            </div>
                                        </div>
                                        <Badge bg="success" className="bg-opacity-25 text-success border border-success border-opacity-50 px-2 py-1">
                                            {formatCurrency(data.totalCreditorAmount || totalDebt, gc)}
                                        </Badge>
                                    </div>

                                    {creditors.length === 0 ? (
                                        <div className="text-muted small text-center py-3">No members owed money</div>
                                    ) : (
                                        <div className="d-flex flex-column gap-2">
                                            {creditors.map((c, idx) => {
                                                const pct = totalDebt > 0 ? Math.round((c.amount / totalDebt) * 100) : 0;
                                                return (
                                                    <div key={idx} className="p-2 rounded bg-black bg-opacity-25 border border-secondary border-opacity-25">
                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '28px', height: '28px', fontSize: '12px' }}>
                                                                    {(c.user?.name || '?').charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="fw-semibold text-light small">{c.user?.name || 'Unknown'}</span>
                                                            </div>
                                                            <span className="fw-bold text-success">{formatCurrency(c.amount, gc)}</span>
                                                        </div>
                                                        <ProgressBar now={pct} variant="success" style={{ height: '4px' }} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* 8.5 & 8.6 Optimized Payment Suggestions */}
                    <div className="glass-card mb-4 border border-secondary border-opacity-25">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <h6 className="fw-bold text-uppercase text-muted small mb-0">
                                    💡 Optimized Payment Suggestions ({transactions.length})
                                </h6>
                                <small className="text-muted">Follow these exact payments to settle the entire group efficiently</small>
                            </div>
                            <span className="badge bg-primary bg-opacity-20 text-primary border border-primary border-opacity-50">
                                {transactions.length} Step{transactions.length !== 1 ? 's' : ''} to 0 Debt
                            </span>
                        </div>

                        <div className="d-flex flex-column gap-3">
                            {transactions.map((tx, idx) => {
                                const payer = tx.fromUser || tx.from;
                                const receiver = tx.toUser || tx.to;
                                return (
                                    <div
                                        key={idx}
                                        className="p-3 rounded-3 d-flex flex-wrap justify-content-between align-items-center gap-3 border border-secondary border-opacity-25"
                                        style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                                    >
                                        {/* Payer and Receiver Flow */}
                                        <div className="d-flex align-items-center gap-3 flex-wrap flex-grow-1">
                                            {/* Payer */}
                                            <div className="d-flex align-items-center gap-2" style={{ minWidth: '140px' }}>
                                                <div className="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '36px', height: '36px' }}>
                                                    {(payer?.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="fw-bold text-light small">{payer?.name || 'Unknown'}</div>
                                                    <span className="badge bg-danger bg-opacity-20 text-danger" style={{ fontSize: '10px' }}>Payer</span>
                                                </div>
                                            </div>

                                            {/* Animated Arrow with Amount */}
                                            <div className="d-flex flex-column align-items-center px-2 flex-grow-1 text-center" style={{ minWidth: '120px' }}>
                                                <span className="fw-bold text-success fs-5 mb-1">
                                                    {formatCurrency(tx.amount, gc)}
                                                </span>
                                                <div className="d-flex align-items-center gap-2 w-100 text-muted" style={{ maxWidth: '180px' }}>
                                                    <div style={{ flex: 1, height: '2px', background: 'var(--primary, #6366f1)' }} />
                                                    <FaArrowRight className="text-primary" />
                                                    <div style={{ flex: 1, height: '2px', background: 'var(--primary, #6366f1)' }} />
                                                </div>
                                            </div>

                                            {/* Receiver */}
                                            <div className="d-flex align-items-center gap-2" style={{ minWidth: '140px' }}>
                                                <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '36px', height: '36px' }}>
                                                    {(receiver?.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="fw-bold text-light small">{receiver?.name || 'Unknown'}</div>
                                                    <span className="badge bg-success bg-opacity-20 text-success" style={{ fontSize: '10px' }}>Receiver</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Button if onSettle callback provided */}
                                        {onSettle && (
                                            <div>
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    className="fw-semibold px-3 shadow-sm d-flex align-items-center gap-1"
                                                    onClick={() => onSettle({
                                                        from: payer,
                                                        to: receiver,
                                                        fromUser: payer,
                                                        toUser: receiver,
                                                        amount: tx.amount
                                                    })}
                                                >
                                                    <FaHandHoldingUsd size={14} /> Settle
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* 8.2 Each Member's Net Balance Breakdown */}
            <div className="glass-card border border-secondary border-opacity-25">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <h6 className="fw-bold text-uppercase text-muted small mb-0">
                            👥 Member Net Balances ({balances.length})
                        </h6>
                        <small className="text-muted">Breakdown of total paid, total owed, and final standing per member</small>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table table-dark table-hover align-middle mb-0" style={{ background: 'transparent' }}>
                        <thead>
                            <tr className="text-muted small border-secondary">
                                <th style={{ background: 'transparent' }}>Member</th>
                                <th style={{ background: 'transparent' }} className="text-end">Total Paid</th>
                                <th style={{ background: 'transparent' }} className="text-end">Total Owed</th>
                                <th style={{ background: 'transparent' }} className="text-end">Net Balance</th>
                                <th style={{ background: 'transparent' }} className="text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {balances.map((b, idx) => {
                                const isPositive = b.netBalance > 0.009;
                                const isNegative = b.netBalance < -0.009;
                                const isSettled = !isPositive && !isNegative;

                                return (
                                    <tr key={idx} className="border-secondary border-opacity-25">
                                        <td style={{ background: 'transparent' }}>
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: '32px', height: '32px', fontSize: '13px' }}>
                                                    {(b.user?.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="fw-bold text-light small">{b.user?.name || 'Unknown'}</div>
                                                    {b.user?.email && <div className="text-muted" style={{ fontSize: '11px' }}>{b.user.email}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ background: 'transparent' }} className="text-end text-light small">
                                            {formatCurrency(b.totalPaid || 0, gc)}
                                        </td>
                                        <td style={{ background: 'transparent' }} className="text-end text-light small">
                                            {formatCurrency(b.totalOwed || 0, gc)}
                                        </td>
                                        <td style={{ background: 'transparent' }} className="text-end fw-bold">
                                            <span className={isPositive ? 'text-success' : isNegative ? 'text-danger' : 'text-muted'}>
                                                {isPositive ? `+${formatCurrency(b.netBalance, gc)}` : formatCurrency(b.netBalance, gc)}
                                            </span>
                                        </td>
                                        <td style={{ background: 'transparent' }} className="text-center">
                                            {isPositive && (
                                                <Badge bg="success" className="bg-opacity-25 text-success border border-success border-opacity-50">
                                                    Gets back {formatCurrency(b.netBalance, gc)}
                                                </Badge>
                                            )}
                                            {isNegative && (
                                                <Badge bg="danger" className="bg-opacity-25 text-danger border border-danger border-opacity-50">
                                                    Owes {formatCurrency(Math.abs(b.netBalance), gc)}
                                                </Badge>
                                            )}
                                            {isSettled && (
                                                <Badge bg="secondary" className="bg-opacity-25 text-muted border border-secondary border-opacity-50">
                                                    Settled
                                                </Badge>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DebtSummary;
