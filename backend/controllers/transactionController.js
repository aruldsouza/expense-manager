const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');

// @desc    Get group transaction history (Expenses + Settlements)
// @route   GET /api/groups/:groupId/transactions
// @access  Private
const getGroupTransactions = async (req, res, next) => {
    try {
        const groupId = req.params.groupId;
        const userId = req.user.id || req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            res.status(404);
            throw new Error('Group not found');
        }

        const isMember = group.members.some(m => {
            const mId = m.user ? (m.user._id || m.user) : (m._id || m);
            return mId ? mId.toString() === userId.toString() : false;
        });

        if (!isMember) {
            res.status(403);
            throw new Error('Not authorized to access transactions for this group');
        }

        // Fetch expenses and settlements
        const expenses = await Expense.find({ group: groupId })
            .populate('paidBy', 'name email')
            .populate('splits.user', 'name email')
            .lean();

        const settlements = await Settlement.find({ group: groupId })
            .populate('fromUser', 'name email')
            .populate('toUser', 'name email')
            .lean();

        // Normalize and merge
        const expenseList = expenses.map(expense => ({
            _id: expense._id,
            type: 'EXPENSE',
            title: expense.title || expense.description || 'Expense',
            description: expense.title || expense.description || 'Expense',
            amount: expense.amount,
            paidBy: expense.paidBy,
            payer: expense.paidBy,
            date: expense.date,
            details: {
                splitType: expense.splitType,
                splits: expense.splits
            }
        }));

        const settlementList = settlements.map(settlement => ({
            _id: settlement._id,
            type: 'SETTLEMENT',
            title: 'Settlement',
            description: 'Settlement',
            amount: settlement.amount,
            fromUser: settlement.fromUser,
            toUser: settlement.toUser,
            payer: settlement.fromUser,
            date: settlement.date,
            details: {
                payee: settlement.toUser
            }
        }));

        const transactions = [...expenseList, ...settlementList];

        // Sort by date descending (newest first)
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(transactions);

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getGroupTransactions
};
