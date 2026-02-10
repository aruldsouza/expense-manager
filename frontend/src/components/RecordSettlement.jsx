import React, { useState } from 'react';
import api from '../services/api';
import { Form, Button, InputGroup, Alert, Spinner } from 'react-bootstrap';
import { FaUser, FaMoneyBillWave } from 'react-icons/fa';

const RecordSettlement = ({ groupId, groupMembers, initialData, onSuccess, onCancel }) => {
    // Determine defaults from initialData if present
    const [payer, setPayer] = useState(initialData?.from?._id || '');
    const [payee, setPayee] = useState(initialData?.to?._id || '');
    const [amount, setAmount] = useState(initialData?.amount || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // If initialData changes (e.g. modal reused), update state
    React.useEffect(() => {
        if (initialData) {
            setPayer(initialData.from?._id || '');
            setPayee(initialData.to?._id || '');
            setAmount(initialData.amount || '');
        } else {
            // Reset if opened without data
            setPayer('');
            setPayee('');
            setAmount('');
        }
    }, [initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (payer === payee) {
            setError('Payer and Payee cannot be the same person.');
            return;
        }

        // Payload expects user IDs. 
        // Backend controller expects: { payee, amount } in body, and user is Payer from Auth token...
        // WAIT. 
        // The backend `createSettlement` controller says: `const payer = req.user._id;`
        // This means I can ONLY settle debts where *I* am the payer.
        // But in a group, anyone might record a settlement.
        // If I am User A, and I see User B owes User A (Me), I click "Settle".
        // Who is paying? User B is paying Me.
        // So the "Payer" is User B.
        // If the backend enforces `payer = req.user._id`, then ONLY the person who owes money can record the settlement.
        // This is a restriction. Let's check `settlementController.js`.

        // Yes: `const payer = req.user._id;`
        // Validation: `if (payer.toString() === payee.toString()) ...`

        // This means if I am Admin/User A, I cannot record that "User B paid User C".
        // I can only record "I paid User X".

        // If the user wants to "Settle Up" based on recommendations like "User B owes User A",
        // and I am User A, I technically cannot record it if the backend forces me to be the payer.
        // I would have to be User B to record "I paid User A".

        // FIX: Check if we should allow recording on behalf of others.
        // For now, I'll stick to the backend logic. 
        // CAUTION: The UI has a "Payer" dropdown. This implies I can select who paid.
        // If I select "User B", but the backend ignores it and uses "Me", that's a BUG.
        // I need to fix the backend to accept `payer` from body if provided, or default to `req.user`.

        // Let's assume for this step I will fix the backend to allow specifying payer.

        setLoading(true);

        try {
            const res = await api.post(`/groups/${groupId}/settlements`, {
                payer: payer, // Changed from payerId to payer to match what I'll fix in backend
                payee: payee,
                amount: parseFloat(amount)
            });

            if (res.data.success) {
                onSuccess();
            }
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Failed to record settlement');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4">
            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

            <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="payer">
                    <Form.Label className="fw-bold">Payer (Who paid?)</Form.Label>
                    <InputGroup>
                        <InputGroup.Text><FaUser className="text-danger" /></InputGroup.Text>
                        <Form.Select
                            value={payer}
                            onChange={(e) => setPayer(e.target.value)}
                            required
                        >
                            <option value="" disabled>Select Payer</option>
                            {groupMembers?.map(m => (
                                <option key={m._id} value={m._id}>{m.name}</option>
                            ))}
                        </Form.Select>
                    </InputGroup>
                </Form.Group>

                <div className="text-center my-2 text-muted small">
                    <span className="bg-light px-2 py-1 rounded">pays to</span>
                </div>

                <Form.Group className="mb-3" controlId="payee">
                    <Form.Label className="fw-bold">Payee (Who received?)</Form.Label>
                    <InputGroup>
                        <InputGroup.Text><FaUser className="text-success" /></InputGroup.Text>
                        <Form.Select
                            value={payee}
                            onChange={(e) => setPayee(e.target.value)}
                            required
                        >
                            <option value="" disabled>Select Payee</option>
                            {groupMembers?.map(m => (
                                <option key={m._id} value={m._id}>{m.name}</option>
                            ))}
                        </Form.Select>
                    </InputGroup>
                </Form.Group>

                <Form.Group className="mb-4" controlId="amount">
                    <Form.Label className="fw-bold">Amount</Form.Label>
                    <InputGroup>
                        <InputGroup.Text><FaMoneyBillWave /></InputGroup.Text>
                        <Form.Control
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            required
                        />
                    </InputGroup>
                </Form.Group>

                <div className="d-flex justify-content-end gap-2 border-top pt-3">
                    <Button variant="light" onClick={onCancel} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="success" type="submit" disabled={loading}>
                        {loading ? <Spinner size="sm" /> : 'Record Settlement'}
                    </Button>
                </div>
            </Form>
        </div>
    );
};

export default RecordSettlement;
