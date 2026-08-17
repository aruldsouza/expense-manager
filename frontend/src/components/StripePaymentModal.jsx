import React, { useState, useCallback } from 'react';
import { Modal, Button, Alert, Spinner, Form } from 'react-bootstrap';
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { FaCreditCard, FaShieldAlt, FaLock } from 'react-icons/fa';
import api from '../services/api';
import toast from 'react-hot-toast';

// Load Stripe outside of component to avoid re-creating on every render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

// ─── Inner checkout form (must be inside <Elements>) ─────────────────────────
const CheckoutForm = ({ amount, currency, payeeName, onSuccess, onCancel }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setProcessing(true);
        setError(null);

        const { error: stripeError } = await stripe.confirmPayment({
            elements,
            redirect: 'if_required'
        });

        if (stripeError) {
            setError(stripeError.message);
            setProcessing(false);
        } else {
            toast.success(`✅ Payment of ${amount} ${currency} sent to ${payeeName}!`);
            onSuccess();
        }
    };

    return (
        <Form onSubmit={handleSubmit}>
            <div className="mb-4">
                <PaymentElement />
            </div>

            {error && <Alert variant="danger" className="small">{error}</Alert>}

            <div className="d-flex gap-2">
                <Button variant="outline-secondary" onClick={onCancel} disabled={processing} className="flex-grow-1">
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    disabled={!stripe || processing}
                    className="flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                >
                    {processing ? (
                        <><Spinner size="sm" /> Processing…</>
                    ) : (
                        <><FaLock size={12} /> Pay {currency} {parseFloat(amount).toFixed(2)}</>
                    )}
                </Button>
            </div>

            <p className="text-muted text-center mt-3 small mb-0">
                <FaShieldAlt className="me-1 text-success" />
                Payments are secured and processed by Stripe. Your card details are never shared.
            </p>
        </Form>
    );
};

// ─── Outer modal — fetches PaymentIntent clientSecret ────────────────────────
const StripePaymentModal = ({ show, onHide, groupId, payeeId, payeeName, amount, currency, onSuccess }) => {
    const [clientSecret, setClientSecret] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch the PaymentIntent when the modal opens
    const initPayment = useCallback(async () => {
        if (!show || !amount || !payeeId) return;
        setLoading(true);
        setError(null);
        setClientSecret(null);
        try {
            const res = await api.post(`/groups/${groupId}/payments/intent`, {
                payeeId,
                amount
            });
            setClientSecret(res.data.data.clientSecret);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to initialise payment. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [show, groupId, payeeId, amount]);

    // Init when modal becomes visible
    React.useEffect(() => { initPayment(); }, [initPayment]);

    const handleSuccess = () => {
        onHide();
        if (onSuccess) onSuccess();
    };

    const stripeOptions = clientSecret
        ? { clientSecret, appearance: { theme: 'stripe' } }
        : undefined;

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton className="border-0 pb-0">
                <Modal.Title className="d-flex align-items-center gap-2 fw-bold text-primary">
                    <FaCreditCard /> Pay with Stripe
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="pt-2">
                <div className="bg-light rounded-3 p-3 mb-4 text-center">
                    <p className="text-muted small mb-1">Sending to</p>
                    <h5 className="fw-bold mb-1">{payeeName}</h5>
                    <h2 className="fw-bold text-success mb-0">
                        {currency} {parseFloat(amount || 0).toFixed(2)}
                    </h2>
                </div>

                {loading && (
                    <div className="text-center py-4">
                        <Spinner animation="border" variant="primary" />
                        <p className="text-muted mt-2 small">Initialising secure payment…</p>
                    </div>
                )}

                {error && (
                    <Alert variant="danger">
                        {error}
                        {error.includes('not configured') && (
                            <div className="mt-2 small">
                                Add <code>VITE_STRIPE_PUBLIC_KEY</code> and <code>STRIPE_SECRET_KEY</code> to your environment variables.
                            </div>
                        )}
                    </Alert>
                )}

                {clientSecret && stripeOptions && (
                    <Elements stripe={stripePromise} options={stripeOptions}>
                        <CheckoutForm
                            amount={amount}
                            currency={currency || 'INR'}
                            payeeName={payeeName}
                            onSuccess={handleSuccess}
                            onCancel={onHide}
                        />
                    </Elements>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default StripePaymentModal;
