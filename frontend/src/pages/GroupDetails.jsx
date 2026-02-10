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
    // const [settlementData, setSettlementData] = useState({}); // Unused for opening general modal
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleExpenseAdded = () => {
        setRefreshTrigger(prev => prev + 1);
        setShowAddExpense(false);
    };

    const handleSettlementRecorded = () => {
        setRefreshTrigger(prev => prev + 1);
        setShowRecordSettlement(false);
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
    }, [groupId, refreshTrigger]); // Added refreshTrigger dependency

    if (loading) return <Container className="text-center py-5"><Spinner animation="border" variant="primary" /></Container>;
    if (error) return <Container className="py-5"><Alert variant="danger">{error}</Alert></Container>;
    if (!group) return <Container className="text-center py-5"><h3>Group not found</h3></Container>;

    return (
        <Container className="py-4">
            {/* Header */}
            <div className="mb-4">
                <Link to="/dashboard" className="text-decoration-none text-muted d-flex align-items-center gap-2 mb-2">
                    <FaArrowLeft /> Back to Dashboard
                </Link>
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                    <div>
                        <h1 className="display-6 fw-bold mb-0">{group.name}</h1>
                        <p className="text-muted mb-0">{group.description}</p>
                    </div>
                    <div className="d-flex gap-2">
                        <Button variant="primary" onClick={() => setShowAddExpense(true)} className="d-flex align-items-center gap-2 shadow-sm">
                            <FaPlus /> Add Expense
                        </Button>
                        <Button variant="outline-success" onClick={() => setShowRecordSettlement(true)} className="d-flex align-items-center gap-2 shadow-sm">
                            <FaHandHoldingUsd /> Settle Up
                        </Button>
                    </div>
                </div>
            </div>

            {/* Quick Stats / Members (Optional - could go here) */}

            {/* Main Content Tabs */}
            <Card className="shadow-sm border-0">
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
                                <MemoizedSettlementList groupId={groupId} refreshTrigger={refreshTrigger} />
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
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold"><FaMoneyBillWave className="me-2 text-danger" />Add Expense</Modal.Title>
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
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold"><FaHandHoldingUsd className="me-2 text-success" />Record Settlement</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0">
                    <RecordSettlement
                        groupId={groupId}
                        groupMembers={group.members}
                        onSuccess={handleSettlementRecorded}
                        onCancel={() => setShowRecordSettlement(false)}
                    />
                </Modal.Body>
            </Modal>

        </Container>
    );
};

export default GroupDetails;
