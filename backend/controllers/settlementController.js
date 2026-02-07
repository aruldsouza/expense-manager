const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const Expense = require('../models/Expense');

// @desc    Create a settlement
// @route   POST /api/groups/:groupId/settlements
// @access  Private
const createSettlement = async (req, res, next) => {
    try {
        const { payee, amount } = req.body;
        const groupId = req.params.groupId;
        const payer = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            res.status(404);
            throw new Error('Group not found');
        }

        if (!group.members.includes(payer) || !group.members.includes(payee)) {
            res.status(400);
            throw new Error('Payer and payee must be members of the group');
        }

        if (payer.toString() === payee.toString()) {
            res.status(400);
            throw new Error('Cannot settle with yourself');
        }

        const settlement = await Settlement.create({
            group: groupId,
            payer,
            payee,
            amount
        });

        res.status(201).json({
            success: true,
            data: settlement
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get optimized settlements
// @route   GET /api/groups/:groupId/settlements/optimized
// @access  Private
const getOptimizedSettlements = async (req, res, next) => {
    try {
        const groupId = req.params.groupId;

        const group = await Group.findById(groupId).populate('members', 'name email');
        if (!group) {
            res.status(404);
            throw new Error('Group not found');
        }

        const expenses = await Expense.find({ group: groupId });
        const settlements = await Settlement.find({ group: groupId });

        // 1. Calculate Net Balances
        const balances = {};
        group.members.forEach(member => {
            balances[member._id.toString()] = 0;
        });

        expenses.forEach(expense => {
            const payerId = expense.payer.toString();
            if (balances[payerId] !== undefined) balances[payerId] += expense.amount;

            expense.splits.forEach(split => {
                const userId = split.user.toString();
                if (balances[userId] !== undefined) balances[userId] -= split.amount;
            });
        });

        settlements.forEach(s => {
            const payerId = s.payer.toString();
            const payeeId = s.payee.toString();
            if (balances[payerId] !== undefined) balances[payerId] += s.amount;
            if (balances[payeeId] !== undefined) balances[payeeId] -= s.amount;
        });

        // 2. Separate Debtors and Creditors
        let debtors = [];
        let creditors = [];

        Object.keys(balances).forEach(userId => {
            const amount = balances[userId];
            if (amount < -0.01) debtors.push({ userId, amount });
            if (amount > 0.01) creditors.push({ userId, amount });
        });

        // 3. Greedy Algorithm
        // Sort by magnitude (descending) to settle largest debts first
        debtors.sort((a, b) => a.amount - b.amount); // Ascending (most negative first)
        creditors.sort((a, b) => b.amount - a.amount); // Descending (most positive first)

        const optimizedSettlements = [];
        let i = 0; // debtors index
        let j = 0; // creditors index

        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];

            // Amount to settle is min of |debt| and credit
            const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

            // Record settlement
            const debtorUser = group.members.find(m => m._id.toString() === debtor.userId);
            const creditorUser = group.members.find(m => m._id.toString() === creditor.userId);

            if (amount > 0.01) {
                optimizedSettlements.push({
                    from: debtorUser,
                    to: creditorUser,
                    amount: parseFloat(amount.toFixed(2))
                });
            }

            // Update remaining amounts
            debtor.amount += amount;
            creditor.amount -= amount;

            // Move indices if settled
            if (Math.abs(debtor.amount) < 0.01) i++;
            if (creditor.amount < 0.01) j++;
        }

        res.json({
            success: true,
            data: optimizedSettlements
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    createSettlement,
    getOptimizedSettlements
};
