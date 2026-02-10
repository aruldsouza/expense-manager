import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { FaUsers, FaMoneyBillWave, FaBalanceScale, FaHandHoldingUsd, FaPlus, FaHistory, FaArrowLeft } from 'react-icons/fa';
import AddExpense from '../components/AddExpense';
import ExpenseList from '../components/ExpenseList';
import BalanceList from '../components/BalanceList';
import SettlementList from '../components/SettlementList';
import RecordSettlement from '../components/RecordSettlement';
import TransactionList from '../components/TransactionList';
import { Container, Row, Col, Card, Button, Tabs, Tab, Modal, Spinner, Alert } from 'react-bootstrap';

// Memoized Components
const MemoizedExpenseList = React.memo(ExpenseList);
const MemoizedBalanceList = React.memo(BalanceList);
const MemoizedSettlementList = React.memo(SettlementList);
const MemoizedTransactionList = React.memo(TransactionList);

const GroupDetails = () => {
    const { groupId } = useParams();
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('expenses');

    // Moved these to top to avoid conditional hook call error
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showRecordSettlement, setShowRecordSettlement] = useState(false);
    // State for pre-filling settlement modal
    const [settlementInitialData, setSettlementInitialData] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

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
                                <MemoizedExpenseList groupId={groupId} refreshTrigger={refreshTrigger} />
                            </div>
                        </Tab>
                        <Tab eventKey="balances" title={<><FaBalanceScale className="me-2" />Balances</>}>
                            <div className="p-3">
                                <MemoizedBalanceList groupId={groupId} refreshTrigger={refreshTrigger} />
                            </div>
                        </Tab>
                        <Tab eventKey="settlements" title={<><FaHandHoldingUsd className="me-2" />Settlements</>}>
                            <div className="p-3">
                                <MemoizedSettlementList
                                    groupId={groupId}
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
