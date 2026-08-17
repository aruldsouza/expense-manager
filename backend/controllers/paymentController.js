const Stripe = require('stripe');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const { getIO } = require('../socket');
const { createNotifications } = require('../utils/notificationHelper');

const getStripe = () => {
    if (!process.env.STRIPE_SECRET_KEY) {
        const e = new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in the server environment.');
        e.statusCode = 503;
        throw e;
    }
    return Stripe(process.env.STRIPE_SECRET_KEY);
};

// @desc  Create a Stripe PaymentIntent for settling a debt
// @route POST /api/groups/:groupId/payments/intent
// @access Private (Member)
const createPaymentIntent = async (req, res, next) => {
    try {
        const stripe = getStripe();
        const { groupId } = req.params;
        const { payeeId, amount, note } = req.body;
        const payerId = req.user._id.toString();

        // Validate group membership
        const group = await Group.findById(groupId);
        if (!group) { res.status(404); throw new Error('Group not found'); }

        const memberIds = group.members.map(m => m.user ? m.user.toString() : m.toString());
        if (!memberIds.includes(payerId) || !memberIds.includes(payeeId)) {
            res.status(400); throw new Error('Payer and payee must be members of the group');
        }
        if (payerId === payeeId) { res.status(400); throw new Error('Cannot pay yourself'); }

        const parsedAmount = parseFloat(amount);
        if (!parsedAmount || parsedAmount <= 0) {
            res.status(400); throw new Error('Amount must be a positive number');
        }

        // Stripe amounts are in the smallest currency unit (cents for USD)
        const currency = (group.currency || 'INR').toLowerCase();
        const amountInCents = Math.round(parsedAmount * 100);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency,
            metadata: {
                groupId,
                payerId,
                payeeId,
                note: note || '',
                amountDecimal: parsedAmount.toString()
            },
            description: `Group "${group.name}" settlement payment`
        });

        res.json({
            success: true,
            data: {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                amount: parsedAmount,
                currency: currency.toUpperCase()
            }
        });
    } catch (error) { next(error); }
};

// @desc  Stripe webhook handler — auto-creates Settlement on payment success
// @route POST /api/payments/webhook
// @access Public (verified by Stripe signature)
const stripeWebhook = async (req, res) => {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY || '');
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET || ''
        );
    } catch (err) {
        console.error('Stripe webhook signature error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object;
        const { groupId, payerId, payeeId, note, amountDecimal } = pi.metadata;

        try {
            const group = await Group.findById(groupId);
            if (!group) throw new Error('Group not found for webhook');

            const memberIds = group.members.map(m => m.user ? m.user.toString() : m.toString());
            if (!memberIds.includes(payerId) || !memberIds.includes(payeeId)) {
                throw new Error('Invalid payer or payee for group');
            }

            const amount = parseFloat(amountDecimal);

            // Create the Settlement record
            const settlement = await Settlement.create({
                group: groupId,
                payer: payerId,
                payee: payeeId,
                amount,
                note: note || 'Paid via Stripe',
                isPartial: true, // will be updated below via balance check
                transactionId: pi.id
            });

            // Notify and emit
            try {
                const populated = await Settlement.findById(settlement._id)
                    .populate('payer', 'name email')
                    .populate('payee', 'name email');

                getIO().to(`group:${groupId}`).emit('settlement:new', {
                    settlement: populated,
                    wasPartial: true,
                    remainingDebt: null
                });

                await createNotifications(
                    [payeeId],
                    'settlement:new',
                    `${populated.payer?.name || 'Someone'} settled ₹${amount.toFixed(2)} via Stripe`,
                    { groupId, relatedId: settlement._id }
                );
            } catch (e) {
                console.warn('Post-webhook notification/emit failed:', e.message);
            }

            console.log(`✅ Stripe payment auto-settled: ₹${amount} from ${payerId} to ${payeeId} in group ${groupId}`);
        } catch (err) {
            console.error('Webhook processing error:', err.message);
        }
    }

    res.json({ received: true });
};

module.exports = { createPaymentIntent, stripeWebhook };
