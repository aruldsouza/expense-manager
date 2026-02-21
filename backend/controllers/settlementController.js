const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const mongoose = require('mongoose');
const { getIO } = require('../socket');
const { createNotifications } = require('../utils/notificationHelper');

// ─── Shared: compute net balance between all members ─────────────────────────
const computeNetBalances = async (groupId, members) => {
    const balances = {};
    members.forEach(m => { balances[m._id.toString()] = 0; });

    const [expenses, settlements] = await Promise.all([
        Expense.find({ group: groupId }),
        Settlement.find({ group: groupId })
    ]);

    expenses.forEach(exp => {
        const payerId = exp.payer.toString();
        if (balances[payerId] !== undefined) balances[payerId] += exp.amount;
        exp.splits.forEach(split => {
            const uid = split.user.toString();
            if (balances[uid] !== undefined) balances[uid] -= split.amount;
        });
    });

    settlements.forEach(s => {
        const pid = s.payer.toString();
        const qid = s.payee.toString();
        if (balances[pid] !== undefined) balances[pid] += s.amount;  // payer improves
        if (balances[qid] !== undefined) balances[qid] -= s.amount;  // payee reduces
    });

    return balances;
};

// ─── Shared: outstanding debt that payer owes payee ──────────────────────────
// Returns positive number (how much payer owes payee), or 0 if settled / reversed.
const computeDebtBetween = async (groupId, payerId, payeeId) => {
    const group = await Group.findById(groupId).populate('members', 'name email');
    if (!group) return 0;

    const balances = await computeNetBalances(groupId, group.members);

    // Run greedy algorithm to get pairwise debts
    const debtors = [];
    const creditors = [];
    Object.keys(balances).forEach(uid => {
        const amt = balances[uid];
        if (amt < -0.01) debtors.push({ userId: uid, amount: amt });
        if (amt > 0.01) creditors.push({ userId: uid, amount: amt });
    });

    debtors.sort((a, b) => a.amount - b.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    let outstanding = 0;
    const di = [...debtors];
    const ci = [...creditors];
    let i = 0, j = 0;

    while (i < di.length && j < ci.length) {
        const debtor = di[i];
        const creditor = ci[j];
        const amt = Math.min(Math.abs(debtor.amount), creditor.amount);

        if (amt > 0.01 && debtor.userId === payerId && creditor.userId === payeeId) {
            outstanding += amt;
        }

        debtor.amount += amt;
        creditor.amount -= amt;
        if (Math.abs(debtor.amount) < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }

    return parseFloat(outstanding.toFixed(2));
};

// @desc  GET debt between two specific users
// @route GET /api/groups/:groupId/settlements/debt?payer=X&payee=Y
// @access Private
const getDebtBetween = async (req, res, next) => {
    try {
        const { payer, payee } = req.query;
        if (!payer || !payee) {
            res.status(400); throw new Error('payer and payee query params are required');
        }
        const group = await Group.findById(req.params.groupId);
        if (!group) { res.status(404); throw new Error('Group not found'); }
        if (!group.members.map(m => m.toString()).includes(req.user._id.toString())) {
            res.status(403); throw new Error('Not authorized');
        }
        const outstanding = await computeDebtBetween(req.params.groupId, payer, payee);
        res.json({ success: true, data: { outstanding } });
    } catch (error) { next(error); }
};

// @desc  Create a settlement (supports partial + note)
// @route POST /api/groups/:groupId/settlements
// @access Private
const createSettlement = async (req, res, next) => {
    try {
        const { payee, amount, note } = req.body;
        const payer = req.body.payer || req.user._id;
        const groupId = req.params.groupId;

        const group = await Group.findById(groupId);
        if (!group) { res.status(404); throw new Error('Group not found'); }

        const memberIds = group.members.map(m => m.toString());
        if (!memberIds.includes(payer.toString()) || !memberIds.includes(payee.toString())) {
            res.status(400); throw new Error('Payer and payee must be members of the group');
        }
        if (payer.toString() === payee.toString()) {
            res.status(400); throw new Error('Cannot settle with yourself');
        }

        // Compute outstanding to determine isPartial
        const outstanding = await computeDebtBetween(groupId, payer.toString(), payee.toString());
        const isPartial = outstanding > 0.01 && parseFloat(amount) < outstanding - 0.005;

        const settlement = await Settlement.create({
            group: groupId,
            payer,
            payee,
            amount: parseFloat(amount),
            note: note || '',
            isPartial
        });

        // Fetch remaining debt after this settlement
        const remaining = await computeDebtBetween(groupId, payer.toString(), payee.toString());

        res.status(201).json({
            success: true,
            data: settlement,
            meta: { wasPartial: isPartial, remainingDebt: remaining }
        });

        // Emit to other group members after response sent
        try {
            const populated = await Settlement.findById(settlement._id)
                .populate('payer', 'name email')
                .populate('payee', 'name email');
            getIO().to(`group:${groupId}`).emit('settlement:new', {
                settlement: populated,
                wasPartial: isPartial,
                remainingDebt: remaining
            });

            // Notify the payee
            const payerName = populated.payer?.name || 'Someone';
            const label = isPartial ? 'partially settled' : 'fully settled';
            await createNotifications(
                [payee.toString()],
                'settlement:new',
                `${payerName} ${label} ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)} with you`,
                { groupId, relatedId: settlement._id }
            );
        } catch (e) {
            console.warn('Socket/notification emit failed:', e.message);
        }
    } catch (error) { next(error); }
};

// @desc  Delete a settlement
// @route DELETE /api/groups/:groupId/settlements/:id
// @access Private
const deleteSettlement = async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.groupId);
        if (!group) { res.status(404); throw new Error('Group not found'); }
        if (!group.members.map(m => m.toString()).includes(req.user._id.toString())) {
            res.status(403); throw new Error('Not authorized');
        }

        const settlement = await Settlement.findOneAndDelete({
            _id: req.params.id,
            group: req.params.groupId
        });
        if (!settlement) { res.status(404); throw new Error('Settlement not found'); }

        res.json({ success: true, data: {} });
    } catch (error) { next(error); }
};

// @desc  Get optimized settlement suggestions
// @route GET /api/groups/:groupId/settlements/optimized
// @access Private
const getOptimizedSettlements = async (req, res, next) => {
    try {
        const groupId = req.params.groupId;
        const group = await Group.findById(groupId).populate('members', 'name email');
        if (!group) { res.status(404); throw new Error('Group not found'); }

        const balances = await computeNetBalances(groupId, group.members);

        let debtors = [];
        let creditors = [];
        Object.keys(balances).forEach(userId => {
            const amount = balances[userId];
            if (amount < -0.01) debtors.push({ userId, amount });
            if (amount > 0.01) creditors.push({ userId, amount });
        });

        debtors.sort((a, b) => a.amount - b.amount);
        creditors.sort((a, b) => b.amount - a.amount);

        const optimizedSettlements = [];
        let i = 0, j = 0;

        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];
            const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

            const debtorUser = group.members.find(m => m._id.toString() === debtor.userId);
            const creditorUser = group.members.find(m => m._id.toString() === creditor.userId);

            if (amount > 0.01) {
                optimizedSettlements.push({
                    from: debtorUser,
                    to: creditorUser,
                    amount: parseFloat(amount.toFixed(2))
                });
            }

            debtor.amount += amount;
            creditor.amount -= amount;
            if (Math.abs(debtor.amount) < 0.01) i++;
            if (creditor.amount < 0.01) j++;
        }

        res.json({ success: true, data: optimizedSettlements });
    } catch (error) { next(error); }
};

// @desc  Get all settlements for a group
// @route GET /api/groups/:groupId/settlements
// @access Private
const getSettlements = async (req, res, next) => {
    try {
        const settlements = await Settlement.find({ group: req.params.groupId })
            .populate('payer', 'name email')
            .populate('payee', 'name email')
            .sort({ date: -1 });

        res.json({ success: true, data: settlements });
    } catch (error) { next(error); }
};

module.exports = { createSettlement, getOptimizedSettlements, getSettlements, getDebtBetween, deleteSettlement };
