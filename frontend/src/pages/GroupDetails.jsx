import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FaUsers, FaMoneyBillWave, FaBalanceScale, FaHandHoldingUsd, FaPlus, FaHistory, FaArrowLeft, FaSync, FaChartPie, FaWallet } from 'react-icons/fa';
import AddExpense from '../components/AddExpense';
import ExpenseList from '../components/ExpenseList';
import BalanceList from '../components/BalanceList';
import SettlementList from '../components/SettlementList';
import RecordSettlement from '../components/RecordSettlement';
import TransactionList from '../components/TransactionList';
import BudgetManager from '../components/BudgetManager';
import CategoryAnalytics from '../components/CategoryAnalytics';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Container, Row, Col, Card, Button, Tabs, Tab, Modal, Spinner, Alert } from 'react-bootstrap';

// Memoized Components
const MemoizedExpenseList = React.memo(ExpenseList);
const MemoizedBalanceList = React.memo(BalanceList);
const MemoizedSettlementList = React.memo(SettlementList);
const MemoizedTransactionList = React.memo(TransactionList);

const GroupDetails = () => {
    const { groupId } = useParams();
    const { user } = useAuth();
    const { joinGroup, leaveGroup, on, off } = useSocket();
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('expenses');
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showRecordSettlement, setShowRecordSettlement] = useState(false);
    const [settlementInitialData, setSettlementInitialData] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Socket.IO: join group room + listen for real-time events
    useEffect(() => {
        if (!groupId) return;
        joinGroup(groupId);

        const handleExpenseNew = (expense) => {
            // Only show toast if someone ELSE added it
            if (expense?.payer?._id !== user?._id) {
                toast(`💸 ${expense?.payer?.name || 'Someone'} added "${expense?.description}"`, { icon: '🧾' });
            }
            setRefreshTrigger(prev => prev + 1);
        };

        const handleSettlementNew = ({ settlement, wasPartial }) => {
            if (settlement?.payer?._id !== user?._id) {
                const label = wasPartial ? 'partially settled' : 'fully settled';
                toast(`✅ ${settlement?.payer?.name || 'Someone'} ${label} with ${settlement?.payee?.name || 'someone'}`, { icon: '💰' });
            }
            setRefreshTrigger(prev => prev + 1);
        };

        on('expense:new', handleExpenseNew);
        on('settlement:new', handleSettlementNew);

        return () => {
            leaveGroup(groupId);
            off('expense:new', handleExpenseNew);
            off('settlement:new', handleSettlementNew);
        };
    }, [groupId, user?._id]);

    const handleExpenseAdded = () => {
        setRefreshTrigger(prev => prev + 1);
        setShowAddExpense(false);
    };

    const handleSettlementRecorded = () => {
        setRefreshTrigger(prev => prev + 1);
        setShowRecordSettlement(false);
        setSettlementInitialData(null); // Reset data
    };

    const handleOpenSettlement = (data = null) => {
        setSettlementInitialData(data);
        setShowRecordSettlement(true);
    };

    useEffect(() => {
        const fetchGroupDetails = async () => {
            try {
                const res = await api.get(`/groups/${groupId}`);
                setGroup(res.data.data);
            } catch (err) {
                setError('Failed to load group details');
            } finally {
                setLoading(false);
            }
        };
        fetchGroupDetails();
    }, [groupId, refreshTrigger]);

    if (loading) return <Container className="text-center py-5"><Spinner animation="border" variant="primary" /></Container>;
    if (error) return <Container className="py-5"><Alert variant="danger">{error}</Alert></Container>;
    if (!group) return <Container className="text-center py-5"><h3>Group not found</h3></Container>;

    return (
        <Container className="py-4 animate-fade-in">
            {/* Header */}
            <div className="mb-4">
                <Link to="/dashboard" className="text-decoration-none text-muted d-flex align-items-center gap-2 mb-2 btn btn-link ps-0">
                    <FaArrowLeft /> Back to Dashboard
                </Link>
                <div className="glass-card p-4 d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                    <div>
                        <h1 className="display-6 fw-bold mb-1 text-primary">{group.name}</h1>
                        <p className="text-muted mb-0">{group.description}</p>
                    </div>
                    <div className="d-flex gap-2">
                        <Button
                            className="btn-modern-primary d-flex align-items-center gap-2 shadow-sm rounded-pill px-4"
                            onClick={() => setShowAddExpense(true)}
                        >
                            <FaPlus /> Add Expense
                        </Button>
                        <Button
                            variant="outline-success"
                            onClick={() => handleOpenSettlement(null)}
                            className="d-flex align-items-center gap-2 shadow-sm rounded-pill px-4"
                        >
                            <FaHandHoldingUsd /> Settle Up
                        </Button>
                        <Link
                            to={`/groups/${groupId}/recurring`}
                            className="btn btn-outline-secondary d-flex align-items-center gap-2 shadow-sm rounded-pill px-4 text-decoration-none"
                        >
                            <FaSync /> Recurring
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content Tabs */}
            <Card className="shadow-sm border-0 glass-card">
                <Card.Body className="p-0">
                    <Tabs
                        activeKey={activeTab}
                        onSelect={(k) => setActiveTab(k)}
                        className="mb-3 border-bottom px-3 pt-3"
                        id="group-tabs"
                    >
                        <Tab eventKey="expenses" title={<><FaMoneyBillWave className="me-2" />Expenses</>}>
                            <div className="p-3">
                                <MemoizedExpenseList groupId={groupId} groupCurrency={group.currency} refreshTrigger={refreshTrigger} />
                            </div>
                        </Tab>
                        <Tab eventKey="balances" title={<><FaBalanceScale className="me-2" />Balances</>}>
                            <div className="p-3">
                                <MemoizedBalanceList groupId={groupId} groupCurrency={group.currency} refreshTrigger={refreshTrigger} />
                            </div>
                        </Tab>
                        <Tab eventKey="settlements" title={<><FaHandHoldingUsd className="me-2" />Settlements</>}>
                            <div className="p-3">
                                <MemoizedSettlementList
                                    groupId={groupId}
                                    groupCurrency={group.currency}
                                    refreshTrigger={refreshTrigger}
                                    onSettle={handleOpenSettlement}
                                />
                            </div>
                        </Tab>
                        <Tab eventKey="history" title={<><FaHistory className="me-2" />History</>}>
                            <div className="p-3">
                                <MemoizedTransactionList groupId={groupId} refreshTrigger={refreshTrigger} />
                            </div>
                        </Tab>
                        <Tab eventKey="budgets" title={<><FaWallet className="me-2" />Budgets</>}>
                            <BudgetManager groupId={groupId} groupCurrency={group.currency} refreshTrigger={refreshTrigger} />
                        </Tab>
                        <Tab eventKey="analytics" title={<><FaChartPie className="me-2" />Analytics</>}>
                            <CategoryAnalytics groupId={groupId} groupCurrency={group.currency} />
                        </Tab>
                    </Tabs>
                </Card.Body>
            </Card>

            {/* Add Expense Modal */}
            <Modal show={showAddExpense} onHide={() => setShowAddExpense(false)} centered size="lg">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold text-primary"><FaMoneyBillWave className="me-2" />Add Expense</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0">
                    <AddExpense
                        groupId={groupId}
                        groupMembers={group.members}
                        onSuccess={handleExpenseAdded}
                        onCancel={() => setShowAddExpense(false)}
                    />
                </Modal.Body>
            </Modal>

            {/* Record Settlement Modal */}
            <Modal show={showRecordSettlement} onHide={() => setShowRecordSettlement(false)} centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold text-success"><FaHandHoldingUsd className="me-2" />Record Settlement</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0">
                    <RecordSettlement
                        groupId={groupId}
                        groupMembers={group.members}
                        groupCurrency={group.currency}
                        initialData={settlementInitialData}
                        onSuccess={handleSettlementRecorded}
                        onCancel={() => setShowRecordSettlement(false)}
                    />
                </Modal.Body>
            </Modal>

        </Container>
    );
};

export default GroupDetails;
