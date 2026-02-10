const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // 1. Active Groups
        const groups = await Group.find({ members: { $in: [userId] } });
        const activeGroupsCount = groups.length;
        const groupIds = groups.map(g => g._id);

        // 2. Fetch all relevant data for these groups
        const expenses = await Expense.find({ group: { $in: groupIds } });
        const settlements = await Settlement.find({ group: { $in: groupIds } });

        // 3. Calculate Global Balance (Owed vs Owe) & Total Spend
        let totalBalance = 0;
        let totalSpend = 0; // Amount user actually paid ("Total Expenses" usually implies spend)

        // Process Expenses
        expenses.forEach(expense => {
            const payerId = expense.payer.toString();

            // If user paid, add to positive balance (you are owed)
            if (payerId === userId.toString()) {
                totalBalance += expense.amount;
                totalSpend += expense.amount; // Track total outflow
            }

            // Subtract user's share (splits)
            expense.splits.forEach(split => {
                if (split.user.toString() === userId.toString()) {
                    totalBalance -= split.amount;
                }
            });
        });

        // Process Settlements
        settlements.forEach(settlement => {
            const payerId = settlement.payer.toString();
            const payeeId = settlement.payee.toString();

            // If user paid (settled debt), balance increases (debt reduces)
            if (payerId === userId.toString()) {
                totalBalance += settlement.amount;
                totalSpend += settlement.amount;
            }

            // If user received (settled credit), balance decreases (credit reduces)
            if (payeeId === userId.toString()) {
                totalBalance -= settlement.amount;
            }
        });

        // "You are owed" = logic: if totalBalance > 0, shows as +$_; if < 0 shows as owed.
        // The dashboard asks for "You are owed" specifically. 
        // We can split it:
        // Net position: Positive = Owed to you. Negative = You owe.

        // Let's refine "Total Expenses".
        // Does user want "My share of expenses" (Cost) or "Amount I fronted" (Cashflow)?
        // Usually "Total Expenses" in dashboards means "My total share of costs". 
        // Let's calculate "My Share" separate from "Amounts Paid".

        let myTotalShare = 0;
        expenses.forEach(e => {
            e.splits.forEach(s => {
                if (s.user.toString() === userId.toString()) {
                    myTotalShare += s.amount;
                }
            })
        });

        res.json({
            success: true,
            data: {
                activeGroups: activeGroupsCount,
                totalExpenses: parseFloat(myTotalShare.toFixed(2)), // "My Cost"
                totalPaid: parseFloat(totalSpend.toFixed(2)),       // "My Cash Outflow"
                netBalance: parseFloat(totalBalance.toFixed(2)),    // + means owed to me, - means I owe
                youAreOwed: totalBalance > 0 ? parseFloat(totalBalance.toFixed(2)) : 0
            }
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboardStats
};
