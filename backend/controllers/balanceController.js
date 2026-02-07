const Expense = require('../models/Expense');
const Group = require('../models/Group');
const Settlement = require('../models/Settlement');

// @desc    Get group balances
// @route   GET /api/groups/:groupId/balances
// @access  Private
const getGroupBalances = async (req, res, next) => {
    try {
        const groupId = req.params.groupId;

        const group = await Group.findById(groupId).populate('members', 'name email');
        if (!group) {
            res.status(404);
            throw new Error('Group not found');
        }

        if (!group.members.some(member => member._id.toString() === req.user._id.toString())) {
            res.status(403);
            throw new Error('Not authorized to access balances for this group');
        }

        const expenses = await Expense.find({ group: groupId });
        const settlements = await Settlement.find({ group: groupId });

        // Initialize balances
        const balances = {};
        group.members.forEach(member => {
            balances[member._id.toString()] = {
                user: member,
                balance: 0
            };
        });

        // Calculate balances from expenses
        expenses.forEach(expense => {
            const payerId = expense.payer.toString();

            // Payer gets positive balance (money owed to them)
            if (balances[payerId]) {
                balances[payerId].balance += expense.amount;
            }

            // Split users get negative balance (money they owe)
            expense.splits.forEach(split => {
                const userId = split.user.toString();
                if (balances[userId]) {
                    balances[userId].balance -= split.amount;
                }
            });
        });

        // Calculate balances from settlements
        settlements.forEach(settlement => {
            const payerId = settlement.payer.toString(); // The one who paid (settled debt)
            const payeeId = settlement.payee.toString(); // The one who received

            // Payer (debtor paying back) gets positive balance change (debt reduces -> balance increases)
            if (balances[payerId]) {
                balances[payerId].balance += settlement.amount;
            }

            // Payee (creditor receiving) gets negative balance change (credit reduces -> balance decreases)
            if (balances[payeeId]) {
                balances[payeeId].balance -= settlement.amount;
            }
        });

        // Format response
        const balanceList = Object.values(balances).map(item => ({
            user: item.user,
            balance: parseFloat(item.balance.toFixed(2))
        }));

        res.json({
            success: true,
            data: balanceList
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getGroupBalances
};
