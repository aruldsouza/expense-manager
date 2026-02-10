import React, { useState } from 'react';
import api from '../services/api';
import { Form, Button, InputGroup, Alert, Spinner } from 'react-bootstrap';
import { FaUser, FaMoneyBillWave } from 'react-icons/fa';

const RecordSettlement = ({ groupId, groupMembers, onSuccess, onCancel }) => {
    const [payer, setPayer] = useState('');
    const [payee, setPayee] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (payer === payee) {
            setError('Payer and Payee cannot be the same person.');
            return;
        }

        setLoading(true);

        try {
            const res = await api.post(`/groups/${groupId}/settlements`, {
                payerId: payer,
                payeeId: payee,
                amount: parseFloat(amount)
            });

            if (res.data.success) {
                onSuccess();
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to record settlement');
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
