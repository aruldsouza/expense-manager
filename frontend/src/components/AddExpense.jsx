import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Form, Button, InputGroup, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { FaMoneyBillWave, FaAlignLeft, FaUser, FaDollarSign, FaPercentage, FaCheckCircle, FaRegCircle, FaTag } from 'react-icons/fa';

const CATEGORIES = ['Food', 'Travel', 'Utilities', 'Rent', 'Entertainment', 'Shopping', 'Health', 'Transport', 'Other', 'Custom'];

const AddExpense = ({ groupId, groupMembers, onSuccess, onCancel }) => {
    const { user } = useAuth();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Other');
    const [payer, setPayer] = useState(user?._id || '');
    const [splitType, setSplitType] = useState('EQUAL'); // EQUAL, UNEQUAL, PERCENT
    const [splits, setSplits] = useState({}); // { userId: amountOrPercent }
    const [involvedMembers, setInvolvedMembers] = useState([]); // Array of user IDs
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Initialize splits and involved members
    useEffect(() => {
        if (groupMembers && groupMembers.length > 0) {
            setInvolvedMembers(groupMembers.map(m => m._id));

            const initialSplits = {};
            groupMembers.forEach(m => {
                initialSplits[m._id] = '';
            });
            setSplits(initialSplits);
        }
    }, [groupMembers]);

    // Set default payer
    useEffect(() => {
        if (user && !payer && groupMembers?.length > 0) {
            // check if user is in groupMembers
            const isMember = groupMembers.find(m => m._id === user._id);
            if (isMember) setPayer(user._id);
            else if (groupMembers.length > 0) setPayer(groupMembers[0]._id);
        }
    }, [user, payer, groupMembers]);

    const handleSplitChange = (userId, value) => {
        setSplits(prev => ({
            ...prev,
            [userId]: value
        }));
    };

    const toggleMemberInvolvement = (userId) => {
        if (involvedMembers.includes(userId)) {
            // Don't allow removing the last member
            if (involvedMembers.length > 1) {
                setInvolvedMembers(involvedMembers.filter(id => id !== userId));
            }
        } else {
            setInvolvedMembers([...involvedMembers, userId]);
        }
    };

    const validateSplits = () => {
        const totalAmount = parseFloat(amount);
        if (isNaN(totalAmount) || totalAmount <= 0) return 'Invalid amount';

        if (involvedMembers.length === 0) return 'At least one member must be involved';

        if (splitType === 'EQUAL') return null;

        let totalSplit = 0;

        involvedMembers.forEach(id => {
            const val = parseFloat(splits[id] || 0);
            totalSplit += val;
        });

        if (splitType === 'PERCENT') {
            if (Math.abs(totalSplit - 100) > 0.1) return `Total percentage must be 100% (Current: ${totalSplit}%)`;
        } else if (splitType === 'UNEQUAL') {
            if (Math.abs(totalSplit - totalAmount) > 0.01) return `Total split must match expense amount (Current: ${totalSplit}, Required: ${totalAmount})`;
        }

        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const validationError = validateSplits();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);

        try {
            const payload = {
                description,
                amount: parseFloat(amount),
                payer,
                splitType,
                category,
                splits: []
            };

            if (splitType === 'EQUAL') {
                // For EQUAL, we send the involved members so backend knows who to split among
                payload.splits = involvedMembers.map(id => ({
                    user: id,
                    amount: 0 // Backend calculates this
                }));
            } else {
                // For UNEQUAL/PERCENT, only send involved members with their values
                payload.splits = involvedMembers.map(id => ({
                    user: id,
                    amount: parseFloat(splits[id] || 0),
                    percent: splitType === 'PERCENT' ? parseFloat(splits[id] || 0) : undefined
                }));
            }

            const res = await api.post(`/groups/${groupId}/expenses`, payload);
            if (res.data.success) {
                onSuccess();
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add expense');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4">
            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

            <Form onSubmit={handleSubmit}>
                <Row>
                    <Col md={12}>
                        <Form.Group className="mb-3" controlId="description">
                            <Form.Label className="fw-bold">Description</Form.Label>
                            <InputGroup>
                                <InputGroup.Text><FaAlignLeft /></InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g., Dinner, Taxi, Groceries"
                                    required
                                />
                            </InputGroup>
                        </Form.Group>

                        {/* Category */}
                        <Form.Group className="mb-3" controlId="category">
                            <Form.Label className="fw-bold">Category</Form.Label>
                            <InputGroup>
                                <InputGroup.Text><FaTag /></InputGroup.Text>
                                <Form.Select value={category} onChange={e => setCategory(e.target.value)}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </Form.Select>
                            </InputGroup>
                        </Form.Group>
                    </Col>
                </Row>

                <Row>
                    <Col md={6}>
                        <Form.Group className="mb-3" controlId="amount">
                            <Form.Label className="fw-bold">Amount</Form.Label>
                            <InputGroup>
                                <InputGroup.Text><FaMoneyBillWave /></InputGroup.Text>
                                <Form.Control
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    required
                                />
                            </InputGroup>
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group className="mb-3" controlId="payer">
                            <Form.Label className="fw-bold">Paid By</Form.Label>
                            <InputGroup>
                                <InputGroup.Text><FaUser /></InputGroup.Text>
                                <Form.Select
                                    value={payer}
                                    onChange={(e) => setPayer(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>Select Payer</option>
                                    {groupMembers && groupMembers.map(m => (
                                        <option key={m._id} value={m._id}>{m.name}</option>
                                    ))}
                                </Form.Select>
                            </InputGroup>
                        </Form.Group>
                    </Col>
                </Row>

                <div className="mb-4">
                    <Form.Label className="fw-bold d-block">Split With</Form.Label>
                    <div className="d-flex flex-wrap gap-2">
                        {groupMembers && groupMembers.map(m => {
                            const isSelected = involvedMembers.includes(m._id);
                            return (
                                <div
                                    key={m._id}
                                    onClick={() => toggleMemberInvolvement(m._id)}
                                    className={`d-flex align-items-center gap-2 px-3 py-2 rounded-pill border cursor-pointer ${isSelected ? 'bg-primary text-white border-primary' : 'bg-light text-muted'}`}
                                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    {isSelected ? <FaCheckCircle /> : <FaRegCircle />}
                                    <span className="fw-bold">{m.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <Form.Group className="mb-4" controlId="splitType">
                    <Form.Label className="fw-bold">Split Method</Form.Label>
                    <div className="d-flex gap-3">
                        <Form.Check
                            type="radio"
                            id="split-equal"
                            label="Equally"
                            name="splitType"
                            value="EQUAL"
                            checked={splitType === 'EQUAL'}
                            onChange={(e) => setSplitType(e.target.value)}
                        />
                        <Form.Check
                            type="radio"
                            id="split-unequal"
                            label="Unequally ($)"
                            name="splitType"
                            value="UNEQUAL"
                            checked={splitType === 'UNEQUAL'}
                            onChange={(e) => setSplitType(e.target.value)}
                        />
                        <Form.Check
                            type="radio"
                            id="split-percent"
                            label="Percentage (%)"
                            name="splitType"
                            value="PERCENT"
                            checked={splitType === 'PERCENT'}
                            onChange={(e) => setSplitType(e.target.value)}
                        />
                    </div>
                </Form.Group>

                {splitType !== 'EQUAL' && (
                    <div className="mb-4 bg-light p-3 rounded border">
                        <h6 className="fw-bold mb-3 small text-muted text-uppercase">
                            Split Details ({splitType === 'PERCENT' ? '%' : '$'})
                        </h6>
                        {groupMembers
                            .filter(m => involvedMembers.includes(m._id))
                            .map(m => (
                                <Form.Group as={Row} className="mb-2 align-items-center" controlId={`split-${m._id}`} key={m._id}>
                                    <Form.Label column sm="8" className="mb-0">
                                        {m.name}
                                    </Form.Label>
                                    <Col sm="4">
                                        <InputGroup size="sm">
                                            <InputGroup.Text>
                                                {splitType === 'PERCENT' ? <FaPercentage size={10} /> : <FaDollarSign size={10} />}
                                            </InputGroup.Text>
                                            <Form.Control
                                                type="number"
                                                min="0"
                                                step={splitType === 'PERCENT' ? "1" : "0.01"}
                                                value={splits[m._id] || ''}
                                                onChange={(e) => handleSplitChange(m._id, e.target.value)}
                                                placeholder="0"
                                            />
                                        </InputGroup>
                                    </Col>
                                </Form.Group>
                            ))}
                    </div>
                )}

                <div className="d-flex justify-content-end gap-2 border-top pt-3">
                    <Button variant="light" onClick={onCancel} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? <Spinner size="sm" /> : 'Save Expense'}
                    </Button>
                </div>
            </Form>
        </div>
    );
};

export default AddExpense;
