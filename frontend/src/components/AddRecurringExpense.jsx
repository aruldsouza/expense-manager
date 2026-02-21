import React, { useState, useEffect } from 'react';
import {
    Form, Button, InputGroup, Row, Col, Alert, Spinner, Modal
} from 'react-bootstrap';
import {
    FaAlignLeft, FaMoneyBillWave, FaUser, FaClock, FaCode,
    FaCalendarAlt, FaDollarSign, FaPercentage, FaCheckCircle, FaRegCircle
} from 'react-icons/fa';
import { createRecurringExpense } from '../services/api';
import { useAuth } from '../context/AuthContext';

const FREQUENCIES = [
    { value: 'daily', label: '📅 Daily' },
    { value: 'weekly', label: '📆 Weekly' },
    { value: 'monthly', label: '🗓️ Monthly' },
    { value: 'custom', label: '⚙️ Custom (Cron)' },
];

const AddRecurringExpense = ({ show, onHide, groupId, groupMembers, onSuccess }) => {
    const { user } = useAuth();

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [payer, setPayer] = useState('');
    const [splitType, setSplitType] = useState('EQUAL');
    const [splits, setSplits] = useState({});
    const [involvedMembers, setInvolvedMembers] = useState([]);
    const [frequency, setFrequency] = useState('monthly');
    const [cronExpression, setCronExpression] = useState('0 0 1 * *');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setSeconds(0, 0);
        return d.toISOString().slice(0, 16); // datetime-local format
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (groupMembers?.length > 0) {
            setInvolvedMembers(groupMembers.map(m => m._id));
            const init = {};
            groupMembers.forEach(m => { init[m._id] = ''; });
            setSplits(init);
        }
        if (user) {
            const memberMatch = groupMembers?.find(m => m._id === user._id);
            setPayer(memberMatch ? user._id : groupMembers?.[0]?._id || '');
        }
    }, [groupMembers, user, show]);

    const toggleMember = (id) => {
        if (involvedMembers.includes(id)) {
            if (involvedMembers.length > 1) setInvolvedMembers(prev => prev.filter(m => m !== id));
        } else {
            setInvolvedMembers(prev => [...prev, id]);
        }
    };

    const validateForm = () => {
        const amt = parseFloat(amount);
        if (!description.trim()) return 'Description is required';
        if (isNaN(amt) || amt <= 0) return 'Enter a valid positive amount';
        if (!payer) return 'Select a payer';
        if (involvedMembers.length === 0) return 'At least one member must be involved';

        if (splitType === 'UNEQUAL') {
            const total = involvedMembers.reduce((s, id) => s + parseFloat(splits[id] || 0), 0);
            if (Math.abs(total - amt) > 0.01) return `Split amounts must sum to $${amt} (current: $${total.toFixed(2)})`;
        }
        if (splitType === 'PERCENT') {
            const total = involvedMembers.reduce((s, id) => s + parseFloat(splits[id] || 0), 0);
            if (Math.abs(total - 100) > 0.1) return `Percentages must sum to 100% (current: ${total}%)`;
        }
        if (frequency === 'custom' && !cronExpression.trim()) return 'Cron expression is required for custom frequency';
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const validErr = validateForm();
        if (validErr) { setError(validErr); return; }

        setLoading(true);
        try {
            let splitPayload = [];
            if (splitType === 'EQUAL') {
                splitPayload = involvedMembers.map(id => ({ user: id, amount: 0 }));
            } else if (splitType === 'UNEQUAL') {
                splitPayload = involvedMembers.map(id => ({ user: id, amount: parseFloat(splits[id] || 0) }));
            } else {
                splitPayload = involvedMembers.map(id => ({
                    user: id,
                    amount: 0,
                    percent: parseFloat(splits[id] || 0)
                }));
            }

            await createRecurringExpense(groupId, {
                description,
                amount: parseFloat(amount),
                payer,
                splitType,
                splits: splitPayload,
                frequency,
                cronExpression: frequency === 'custom' ? cronExpression : undefined,
                startDate: new Date(startDate).toISOString(),
            });

            onSuccess?.();
            onHide();
            // Reset form
            setDescription(''); setAmount(''); setSplitType('EQUAL');
            setFrequency('monthly'); setError('');
        } catch (err) {
            setError(err.response?.data?.errors?.[0]?.message || err.response?.data?.error || 'Failed to create recurring expense');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="border-bottom-0 pb-0">
                <Modal.Title className="fw-bold">
                    🔁 New Recurring Expense
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

                <Form onSubmit={handleSubmit}>
                    {/* Description */}
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Description</Form.Label>
                        <InputGroup>
                            <InputGroup.Text><FaAlignLeft /></InputGroup.Text>
                            <Form.Control
                                type="text"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="e.g., Monthly Rent, Netflix Subscription"
                                required
                            />
                        </InputGroup>
                    </Form.Group>

                    <Row>
                        <Col md={6}>
                            {/* Amount */}
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">Amount</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text><FaMoneyBillWave /></InputGroup.Text>
                                    <Form.Control
                                        type="number" step="0.01" min="0.01"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        placeholder="0.00" required
                                    />
                                </InputGroup>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            {/* Payer */}
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">Paid By</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text><FaUser /></InputGroup.Text>
                                    <Form.Select value={payer} onChange={e => setPayer(e.target.value)} required>
                                        <option value="" disabled>Select Payer</option>
                                        {groupMembers?.map(m => (
                                            <option key={m._id} value={m._id}>{m.name}</option>
                                        ))}
                                    </Form.Select>
                                </InputGroup>
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Frequency */}
                    <Row>
                        <Col md={frequency === 'custom' ? 6 : 12}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">Frequency</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text><FaClock /></InputGroup.Text>
                                    <Form.Select value={frequency} onChange={e => setFrequency(e.target.value)}>
                                        {FREQUENCIES.map(f => (
                                            <option key={f.value} value={f.value}>{f.label}</option>
                                        ))}
                                    </Form.Select>
                                </InputGroup>
                            </Form.Group>
                        </Col>
                        {frequency === 'custom' && (
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold">Cron Expression</Form.Label>
                                    <InputGroup>
                                        <InputGroup.Text><FaCode /></InputGroup.Text>
                                        <Form.Control
                                            type="text"
                                            value={cronExpression}
                                            onChange={e => setCronExpression(e.target.value)}
                                            placeholder="e.g., 0 0 1 * *"
                                        />
                                    </InputGroup>
                                    <Form.Text className="text-muted">
                                        Min Hr DayOM Month DayOW — <a href="https://crontab.guru/" target="_blank" rel="noreferrer">crontab.guru</a>
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                        )}
                    </Row>

                    {/* Start Date */}
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Start Date &amp; Time</Form.Label>
                        <InputGroup>
                            <InputGroup.Text><FaCalendarAlt /></InputGroup.Text>
                            <Form.Control
                                type="datetime-local"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                required
                            />
                        </InputGroup>
                    </Form.Group>

                    {/* Split With */}
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold d-block">Split With</Form.Label>
                        <div className="d-flex flex-wrap gap-2">
                            {groupMembers?.map(m => {
                                const selected = involvedMembers.includes(m._id);
                                return (
                                    <div
                                        key={m._id}
                                        onClick={() => toggleMember(m._id)}
                                        className={`d-flex align-items-center gap-2 px-3 py-2 rounded-pill border ${selected ? 'bg-primary text-white border-primary' : 'bg-light text-muted'}`}
                                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                    >
                                        {selected ? <FaCheckCircle /> : <FaRegCircle />}
                                        <span className="fw-semibold">{m.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </Form.Group>

                    {/* Split Type */}
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Split Method</Form.Label>
                        <div className="d-flex gap-3">
                            {['EQUAL', 'UNEQUAL', 'PERCENT'].map(type => (
                                <Form.Check
                                    key={type}
                                    type="radio"
                                    id={`re-split-${type}`}
                                    label={type === 'EQUAL' ? 'Equally' : type === 'UNEQUAL' ? 'Unequally ($)' : 'Percentage (%)'}
                                    name="splitTypeRecurring"
                                    value={type}
                                    checked={splitType === type}
                                    onChange={e => setSplitType(e.target.value)}
                                />
                            ))}
                        </div>
                    </Form.Group>

                    {/* Split amounts detail */}
                    {splitType !== 'EQUAL' && (
                        <div className="mb-3 bg-light p-3 rounded border">
                            <h6 className="fw-bold mb-3 small text-muted text-uppercase">
                                Split Details ({splitType === 'PERCENT' ? '%' : '$'})
                            </h6>
                            {groupMembers?.filter(m => involvedMembers.includes(m._id)).map(m => (
                                <Form.Group as={Row} key={m._id} className="mb-2 align-items-center">
                                    <Form.Label column sm="8" className="mb-0">{m.name}</Form.Label>
                                    <Col sm="4">
                                        <InputGroup size="sm">
                                            <InputGroup.Text>
                                                {splitType === 'PERCENT' ? <FaPercentage size={10} /> : <FaDollarSign size={10} />}
                                            </InputGroup.Text>
                                            <Form.Control
                                                type="number" min="0"
                                                step={splitType === 'PERCENT' ? '1' : '0.01'}
                                                value={splits[m._id] || ''}
                                                onChange={e => setSplits(p => ({ ...p, [m._id]: e.target.value }))}
                                                placeholder="0"
                                            />
                                        </InputGroup>
                                    </Col>
                                </Form.Group>
                            ))}
                        </div>
                    )}

                    <div className="d-flex justify-content-end gap-2 border-top pt-3 mt-2">
                        <Button variant="light" onClick={onHide} disabled={loading}>Cancel</Button>
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? <Spinner size="sm" /> : '🔁 Create Recurring Expense'}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default AddRecurringExpense;
