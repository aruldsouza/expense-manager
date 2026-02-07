const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');

// @desc    Get group transaction history (Expenses + Settlements)
// @route   GET /api/groups/:groupId/transactions
// @access  Private
const getGroupTransactions = async (req, res, next) => {
    try {
        const groupId = req.params.groupId;

        const group = await Group.findById(groupId);
        if (!group) {
            res.status(404);
            throw new Error('Group not found');
        }

        if (!group.members.includes(req.user._id)) {
            res.status(403);
            throw new Error('Not authorized to access transactions for this group');
        }

        // Fetch expenses and settlements
        const expenses = await Expense.find({ group: groupId })
            .populate('payer', 'name email')
            .populate('splits.user', 'name email')
            .lean(); // Use lean for better performance and easier modification

        const settlements = await Settlement.find({ group: groupId })
            .populate('payer', 'name email')
            .populate('payee', 'name email')
            .lean();

        // Normalize and merge
        const expenseList = expenses.map(expense => ({
            _id: expense._id,
            type: 'EXPENSE',
            description: expense.description,
            amount: expense.amount,
            payer: expense.payer,
            date: expense.date,
            details: {
                splitType: expense.splitType,
                splits: expense.splits
            }
        }));

        const settlementList = settlements.map(settlement => ({
            _id: settlement._id,
            type: 'SETTLEMENT',
            description: 'Settlement',
            amount: settlement.amount,
            payer: settlement.payer, // Who paid
            date: settlement.date,
            details: {
                payee: settlement.payee // Who received
            }
        }));

        const transactions = [...expenseList, ...settlementList];

        // Sort by date descending (newest first)
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            success: true,
            count: transactions.length,
            data: transactions
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getGroupTransactions
};
