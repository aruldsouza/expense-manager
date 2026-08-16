import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Form, Button, InputGroup, Alert, Spinner, Badge, Card } from 'react-bootstrap';
import { FaUser, FaMoneyBillWave, FaStickyNote, FaBolt, FaCheckCircle } from 'react-icons/fa';
import { useCurrency } from '../context/CurrencyContext';

const RecordSettlement = ({ groupId, groupMembers, groupCurrency, initialData, onSuccess, onCancel }) => {
    const [payer, setPayer] = useState(initialData?.from?._id || '');
    const [payee, setPayee] = useState(initialData?.to?._id || '');
    const [amount, setAmount] = useState(initialData?.amount ? String(initialData.amount) : '');
    const [note, setNote] = useState('');
    const [outstanding, setOutstanding] = useState(null);   // null = not fetched yet
    const [fetchingDebt, setFetchingDebt] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMeta, setSuccessMeta] = useState(null);   // { wasPartial, remainingDebt }
    const { formatCurrency } = useCurrency();
    const gc = groupCurrency || 'USD';

    // Sync when initialData changes
    useEffect(() => {
        if (initialData) {
            setPayer(initialData.from?._id || '');
            setPayee(initialData.to?._id || '');
            setAmount(initialData.amount ? String(initialData.amount) : '');
        } else {
            setPayer(''); setPayee(''); setAmount('');
        }
        setNote('');
        setOutstanding(null);
        setSuccessMeta(null);
    }, [initialData]);

    // Fetch outstanding debt when both payer + payee are selected
    const fetchDebt = useCallback(async (p, q) => {
        if (!p || !q || p === q) { setOutstanding(null); return; }
        setFetchingDebt(true);
        try {
            const res = await api.get(`/groups/${groupId}/settlements/debt`, { params: { payer: p, payee: q } });
            if (res.data.success) setOutstanding(res.data.data.outstanding);
        } catch { setOutstanding(null); }
        finally { setFetchingDebt(false); }
    }, [groupId]);

    useEffect(() => { fetchDebt(payer, payee); }, [payer, payee, fetchDebt]);

    const handlePayFull = () => {
        if (outstanding > 0) setAmount(String(outstanding));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setSuccessMeta(null);

        if (payer === payee) { setError('Payer and Payee cannot be the same person.'); return; }
        const amtNum = parseFloat(amount);
        if (isNaN(amtNum) || amtNum <= 0) { setError('Enter a valid amount.'); return; }
        if (outstanding !== null && amtNum > outstanding + 0.005) {
            setError(`Amount cannot exceed outstanding debt of ${formatCurrency(outstanding, gc)}`);
            return;
        }

        setLoading(true);
        try {
            const res = await api.post(`/groups/${groupId}/settlements`, {
                payer, payee, amount: amtNum, note
            });
            if (res.data.success) {
                setSuccessMeta(res.data.meta);
                // brief delay so user sees confirmation, then call onSuccess
                setTimeout(() => onSuccess(), 1800);
            }
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Failed to record settlement');
        } finally {
            setLoading(false);
        }
    };

    // Success confirmation card
    if (successMeta) {
        return (
            <div className="p-4 text-center">
                <FaCheckCircle className="text-success mb-3" style={{ fontSize: '3rem' }} />
                <h5 className="fw-bold text-success mb-2">Settlement Recorded!</h5>
                {successMeta.wasPartial ? (
                    <p className="text-muted">
                        This was a <Badge bg="warning" text="dark">Partial</Badge> payment.<br />
                        <span className="fw-bold">{formatCurrency(successMeta.remainingDebt, gc)}</span> still outstanding.
                    </p>
                ) : (
                    <p className="text-muted">
                        <Badge bg="success">Fully Settled</Badge> — no remaining debt between these members.
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="p-4">
            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

            <Form onSubmit={handleSubmit}>
                {/* Payer */}
                <Form.Group className="mb-3" controlId="payer">
                    <Form.Label className="fw-bold">Payer <span className="text-muted fw-normal">(Who paid?)</span></Form.Label>
                    <InputGroup>
                        <InputGroup.Text><FaUser className="text-danger" /></InputGroup.Text>
                        <Form.Select value={payer} onChange={e => setPayer(e.target.value)} required>
                            <option value="" disabled>Select Payer</option>
                            {groupMembers?.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                        </Form.Select>
                    </InputGroup>
                </Form.Group>

                <div className="text-center my-2 text-muted small">
                    <span className="bg-light px-2 py-1 rounded">pays to</span>
                </div>

                {/* Payee */}
                <Form.Group className="mb-3" controlId="payee">
                    <Form.Label className="fw-bold">Payee <span className="text-muted fw-normal">(Who received?)</span></Form.Label>
                    <InputGroup>
                        <InputGroup.Text><FaUser className="text-success" /></InputGroup.Text>
                        <Form.Select value={payee} onChange={e => setPayee(e.target.value)} required>
                            <option value="" disabled>Select Payee</option>
                            {groupMembers?.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                        </Form.Select>
                    </InputGroup>
                </Form.Group>

                {/* Live outstanding debt callout */}
                {payer && payee && payer !== payee && (
                    <Card className="mb-3 border-0 bg-light">
                        <Card.Body className="py-2 px-3">
                            {fetchingDebt ? (
                                <Spinner size="sm" animation="border" className="me-2" />
                            ) : outstanding !== null && outstanding > 0.005 ? (
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-muted small">
                                        {groupMembers?.find(m => m._id === payer)?.name} owes{' '}
                                        {groupMembers?.find(m => m._id === payee)?.name}:
                                        {' '}<span className="fw-bold text-danger">{formatCurrency(outstanding, gc)}</span>
                                    </span>
                                    <Button size="sm" variant="outline-primary" className="rounded-pill px-3 d-flex align-items-center gap-1"
                                        onClick={handlePayFull} type="button">
                                        <FaBolt size={11} /> Pay Full
                                    </Button>
                                </div>
                            ) : outstanding === 0 ? (
                                <span className="text-success small fw-bold">✅ Already settled — no debt between these two.</span>
                            ) : null}
                        </Card.Body>
                    </Card>
                )}

                {/* Amount with range slider */}
                <Form.Group className="mb-3" controlId="amount">
                    <Form.Label className="fw-bold">Amount</Form.Label>
                    <InputGroup>
                        <InputGroup.Text><FaMoneyBillWave /></InputGroup.Text>
                        <Form.Control
                            type="number"
                            min="0.01"
                            step="0.01"
                            max={outstanding > 0 ? outstanding : undefined}
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.00"
                            required
                        />
                    </InputGroup>
                    {outstanding > 0 && (
                        <div className="mt-2">
                            <Form.Range
                                min={0}
                                max={outstanding}
                                step={0.01}
                                value={parseFloat(amount) || 0}
                                onChange={e => setAmount(e.target.value)}
                            />
                            <div className="d-flex justify-content-between small text-muted">
                                <span>{formatCurrency(0, gc)}</span>
                                <span className={parseFloat(amount) < outstanding ? 'text-warning fw-bold' : 'text-success fw-bold'}>
                                    {parseFloat(amount) > 0 && parseFloat(amount) < outstanding
                                        ? `Partial (${Math.round((parseFloat(amount) / outstanding) * 100)}%)`
                                        : parseFloat(amount) >= outstanding ? '✅ Full settlement' : ''}
                                </span>
                                <span>{formatCurrency(outstanding, gc)}</span>
                            </div>
                        </div>
                    )}
                </Form.Group>

                {/* Optional note */}
                <Form.Group className="mb-4" controlId="note">
                    <Form.Label className="fw-bold d-flex align-items-center gap-2">
                        <FaStickyNote /> Note <span className="text-muted fw-normal small">(optional)</span>
                    </Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={2}
                        maxLength={200}
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="e.g. Paid via UPI, Bank transfer, etc."
                    />
                    <Form.Text className="text-muted">{note.length}/200</Form.Text>
                </Form.Group>

                <div className="d-flex justify-content-end gap-2 border-top pt-3">
                    <Button variant="light" onClick={onCancel} disabled={loading}>Cancel</Button>
                    <Button variant="success" type="submit" disabled={loading || (outstanding === 0 && outstanding !== null)}>
                        {loading ? <Spinner size="sm" /> : 'Record Settlement'}
                    </Button>
                </div>
            </Form>
        </div>
    );
};

export default RecordSettlement;
