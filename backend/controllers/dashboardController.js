const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const cache = require('../utils/cache');

const DASHBOARD_TTL = 120; // seconds

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res, next) => {
    try {
        const userId = (req.user.id || req.user._id).toString();
        const cacheKey = `dashboard:stats:${userId}`;

        // ── Cache hit ─────────────────────────────────────────────────────────
        const cached = await cache.get(cacheKey);
        if (cached) {
            return res.json({ success: true, data: cached, fromCache: true });
        }

        // 1. Active Groups (members can be array of ObjectIds or objects)
        const groups = await Group.find({
            $or: [{ members: userId }, { 'members.user': userId }]
        });
        const activeGroupsCount = groups.length;
        const groupIds = groups.map(g => g._id);

        // 2. Fetch all relevant data for these groups
        const expenses = await Expense.find({ group: { $in: groupIds } });
        const settlements = await Settlement.find({ group: { $in: groupIds } });

        // 3. Calculate Global Balance (Owed vs Owe) & Total Spend
        let totalBalance = 0;
        let totalSpend = 0;

        // Process Expenses
        expenses.forEach(expense => {
            const payerId = (expense.paidBy || expense.payer)?.toString();

            if (payerId === userId) {
                totalBalance += expense.amount;
                totalSpend += expense.amount;
            }

            expense.splits.forEach(split => {
                const sUserId = (split.user._id || split.user)?.toString();
                if (sUserId === userId) {
                    totalBalance -= split.amount;
                }
            });
        });

        // Process Settlements
        settlements.forEach(settlement => {
            const fromId = (settlement.fromUser || settlement.payer)?.toString();
            const toId = (settlement.toUser || settlement.payee)?.toString();

            if (fromId === userId) {
                totalBalance += settlement.amount;
                totalSpend += settlement.amount;
            }

            if (toId === userId) {
                totalBalance -= settlement.amount;
            }
        });

        let myTotalShare = 0;
        expenses.forEach(e => {
            e.splits.forEach(s => {
                const sUserId = (s.user._id || s.user)?.toString();
                if (sUserId === userId) {
                    myTotalShare += s.amount;
                }
            });
        });

        const result = {
            activeGroups: activeGroupsCount,
            totalExpenses: parseFloat(myTotalShare.toFixed(2)),
            totalPaid: parseFloat(totalSpend.toFixed(2)),
            netBalance: parseFloat(totalBalance.toFixed(2)),
            youAreOwed: totalBalance > 0 ? parseFloat(totalBalance.toFixed(2)) : 0
        };

        // ── Cache the result ─────────────────────────────────────────────────
        await cache.set(cacheKey, result, DASHBOARD_TTL);

        res.json({ success: true, data: result });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboardStats
};
