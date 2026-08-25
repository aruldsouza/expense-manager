const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const { CATEGORIES } = require('../models/Budget');

// Helper: verify group membership
const verifyMembership = async (groupId, userId) => {
    const group = await Group.findById(groupId);
    if (!group) { const e = new Error('Group not found'); e.statusCode = 404; throw e; }
    // Group.members is a flat ObjectId array
    if (!group.members.some(m => (m._id || m).toString() === userId.toString())) {
        const e = new Error('Not authorized'); e.statusCode = 403; throw e;
    }
    return group;
};

// Helper: build date filter
const buildDateFilter = (startDate, endDate) => {
    let dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    return Object.keys(dateFilter).length > 0 ? dateFilter : null;
};

// @desc  Spending per category
// @route GET /api/groups/:groupId/analytics/category
// @access Private
const getCategoryAnalytics = async (req, res, next) => {
    try {
        const userId = (req.user.id || req.user._id).toString();
        await verifyMembership(req.params.groupId, userId);
        const dateFilter = buildDateFilter(req.query.startDate, req.query.endDate);

        const matchStage = { group: require('mongoose').Types.ObjectId.createFromHexString(req.params.groupId) };
        if (dateFilter) matchStage.date = dateFilter;

        const pipeline = [
            { $match: matchStage },
            { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } }
        ];
        const spending = await Expense.aggregate(pipeline);

        const spendingMap = {};
        spending.forEach(s => { spendingMap[s._id || 'Other'] = { total: s.total, count: s.count }; });

        const result = CATEGORIES.map(cat => ({
            category: cat,
            total: parseFloat((spendingMap[cat]?.total || 0).toFixed(2)),
            count: spendingMap[cat]?.count || 0
        })).filter(c => c.total > 0);

        res.json({ success: true, data: result });
    } catch (error) { next(error); }
};

// @desc  Monthly spending trends
// @route GET /api/groups/:groupId/analytics/trends
// @access Private
const getMonthlyTrends = async (req, res, next) => {
    try {
        const userId = (req.user.id || req.user._id).toString();
        await verifyMembership(req.params.groupId, userId);
        const dateFilter = buildDateFilter(req.query.startDate, req.query.endDate);

        const matchStage = { group: require('mongoose').Types.ObjectId.createFromHexString(req.params.groupId) };
        if (dateFilter) matchStage.date = dateFilter;

        const pipeline = [
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    total: { $sum: '$amount' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ];

        const trends = await Expense.aggregate(pipeline);
        const result = trends.map(t => ({
            monthYear: `${t._id.year}-${String(t._id.month).padStart(2, '0')}`,
            total: parseFloat(t.total.toFixed(2))
        }));

        res.json({ success: true, data: result });
    } catch (error) { next(error); }
};

// @desc  User spending stats (Top Spender, Highest Debtor)
// @route GET /api/groups/:groupId/analytics/users
// @access Private
const getUserStats = async (req, res, next) => {
    try {
        const userId = (req.user.id || req.user._id).toString();
        const group = await verifyMembership(req.params.groupId, userId);
        const dateFilter = buildDateFilter(req.query.startDate, req.query.endDate);

        const query = { group: req.params.groupId };
        if (dateFilter) query.date = dateFilter;

        // paidBy is the correct field name (not payer)
        const expenses = await Expense.find(query).populate('paidBy', 'name').populate('splits.user', 'name');

        const userStats = {};

        // Initialize for all group members (flat ObjectId array)
        group.members.forEach(m => {
            const id = (m._id || m).toString();
            userStats[id] = { name: 'Unknown', paid: 0, share: 0 };
        });

        expenses.forEach(e => {
            if (!e.paidBy) return;
            const payerId = e.paidBy._id.toString();
            if (!userStats[payerId]) userStats[payerId] = { name: e.paidBy.name, paid: 0, share: 0 };
            userStats[payerId].name = e.paidBy.name;
            userStats[payerId].paid += e.amount;

            e.splits.forEach(s => {
                const splitId = s.user._id.toString();
                if (!userStats[splitId]) userStats[splitId] = { name: s.user.name, paid: 0, share: 0 };
                userStats[splitId].name = s.user.name;
                userStats[splitId].share += s.amount;
            });
        });

        const statsArray = Object.keys(userStats).map(id => {
            const stat = userStats[id];
            return {
                userId: id,
                name: stat.name,
                paid: parseFloat(stat.paid.toFixed(2)),
                share: parseFloat(stat.share.toFixed(2)),
                balance: parseFloat((stat.paid - stat.share).toFixed(2)) // Positive means owed to them, Negative means they owe
            };
        });

        // Top spender = highest 'paid'
        const topSpender = [...statsArray].sort((a, b) => b.paid - a.paid)[0];

        // Highest debtor = most negative 'balance'
        const highestDebtor = [...statsArray].sort((a, b) => a.balance - b.balance)[0];

        res.json({
            success: true,
            data: {
                allUsers: statsArray,
                topSpender: topSpender?.paid > 0 ? topSpender : null,
                highestDebtor: highestDebtor?.balance < 0 ? highestDebtor : null
            }
        });
    } catch (error) { next(error); }
};

// @desc  Export expenses to CSV
// @route GET /api/groups/:groupId/analytics/export
// @access Private
const exportExpensesCsv = async (req, res, next) => {
    try {
        const userId = (req.user.id || req.user._id).toString();
        await verifyMembership(req.params.groupId, userId);
        const dateFilter = buildDateFilter(req.query.startDate, req.query.endDate);

        const query = { group: req.params.groupId };
        if (dateFilter) query.date = dateFilter;

        // paidBy is the correct field; title is the correct field (not description/payer)
        const expenses = await Expense.find(query).populate('paidBy', 'name email').sort({ date: -1 });

        let csv = 'Date,Description,Category,Amount,Payer,SplitType\n';
        expenses.forEach(e => {
            const date = new Date(e.date).toISOString().split('T')[0];
            const desc = `"${(e.title || '').replace(/"/g, '""')}"`;
            const cat = e.category || 'Other';
            const amt = e.amount;
            const payer = `"${e.paidBy?.name || 'Unknown'}"`;
            const splitType = e.splitType;
            csv += `${date},${desc},${cat},${amt},${payer},${splitType}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="expenses_export_${Date.now()}.csv"`);
        res.send(csv);
    } catch (error) { next(error); }
};

// @desc  Financial Health Score for the group (0-100)
// @route GET /api/groups/:groupId/analytics/health-score
// @access Private
const getHealthScore = async (req, res, next) => {
    try {
        const userId = (req.user.id || req.user._id).toString();
        const group = await verifyMembership(req.params.groupId, userId);
        const groupId = req.params.groupId;

        const [expenses, settlements] = await Promise.all([
            Expense.find({ group: groupId }),
            Settlement.find({ group: groupId })
        ]);

        // ─── Factor 1: Settlement Rate (40 pts) ───────────────────────────────
        let settlementScore = 0;
        if (settlements.length > 0) {
            const fullSettlements = settlements.filter(s => !s.isPartial).length;
            settlementScore = Math.round((fullSettlements / settlements.length) * 40);
        } else if (expenses.length === 0) {
            settlementScore = 40;
        }

        // ─── Factor 2: Debt Velocity (30 pts) ────────────────────────────────
        let debtScore = 30;
        const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
        if (totalExpenseAmount > 0) {
            const balances = {};
            // Group.members is a flat ObjectId array
            const memberIds = group.members.map(m => (m._id || m).toString());
            memberIds.forEach(id => { balances[id] = 0; });

            // paidBy is the correct field name (not payer)
            expenses.forEach(e => {
                const pid = (e.paidBy || '').toString();
                if (balances[pid] !== undefined) balances[pid] += e.amount;
                e.splits.forEach(s => {
                    const sid = s.user.toString();
                    if (balances[sid] !== undefined) balances[sid] -= s.amount;
                });
            });
            // fromUser/toUser are the correct field names (not payer/payee)
            settlements.forEach(s => {
                const fromId = (s.fromUser || '').toString();
                const toId = (s.toUser || '').toString();
                if (balances[fromId] !== undefined) balances[fromId] += s.amount;
                if (balances[toId] !== undefined) balances[toId] -= s.amount;
            });

            const totalOutstanding = Object.values(balances)
                .filter(b => b < 0)
                .reduce((sum, b) => sum + Math.abs(b), 0);

            const debtRatio = totalOutstanding / totalExpenseAmount;
            debtScore = Math.max(0, Math.round(30 * (1 - Math.min(debtRatio / 0.5, 1))));
        }

        // ─── Factor 3: Balance Spread (20 pts) ────────────────────────────────
        let spreadScore = 20;
        if (expenses.length > 0 && group.members.length > 1) {
            const memberBalances = {};
            const mids = group.members.map(m => (m._id || m).toString());
            mids.forEach(id => { memberBalances[id] = 0; });
            expenses.forEach(e => {
                const pid = (e.paidBy || '').toString();
                if (memberBalances[pid] !== undefined) memberBalances[pid] += e.amount;
                e.splits.forEach(s => {
                    const sid = s.user.toString();
                    if (memberBalances[sid] !== undefined) memberBalances[sid] -= s.amount;
                });
            });
            settlements.forEach(s => {
                const fromId = (s.fromUser || '').toString();
                const toId = (s.toUser || '').toString();
                if (memberBalances[fromId] !== undefined) memberBalances[fromId] += s.amount;
                if (memberBalances[toId] !== undefined) memberBalances[toId] -= s.amount;
            });

            const vals = Object.values(memberBalances);
            const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
            const variance = vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / vals.length;
            const stdDev = Math.sqrt(variance);
            spreadScore = Math.max(0, Math.round(20 * (1 - Math.min(stdDev / 200, 1))));
        }

        // ─── Factor 4: Recent Activity (10 pts) ──────────────────────────────
        let activityScore = 0;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentSettlement = settlements.some(s => new Date(s.createdAt) >= thirtyDaysAgo);
        const recentExpense = expenses.some(e => new Date(e.createdAt) >= thirtyDaysAgo);
        if (recentSettlement) activityScore = 10;
        else if (recentExpense) activityScore = 5;

        // ─── Total score & grade ──────────────────────────────────────────────
        const score = Math.min(100, settlementScore + debtScore + spreadScore + activityScore);

        let grade;
        if (score >= 80) grade = 'A';
        else if (score >= 60) grade = 'B';
        else if (score >= 40) grade = 'C';
        else grade = 'D';

        const suggestions = [];
        if (settlementScore < 20) suggestions.push('Many debts remain partially settled. Encourage members to pay in full.');
        if (debtScore < 15) suggestions.push('Outstanding debts are high relative to group spending. Settle up soon.');
        if (spreadScore < 10) suggestions.push('One or more members carry a disproportionate share. Consider rebalancing expenses.');
        if (activityScore === 0) suggestions.push('No recent activity. Log an expense or record a settlement to stay on track.');
        else if (activityScore === 5) suggestions.push('New expenses added recently but no settlements. Consider settling existing debts.');
        if (suggestions.length === 0) suggestions.push('Great job! Your group finances are well-managed. Keep it up! 🎉');

        res.json({
            success: true,
            data: {
                score,
                grade,
                factors: {
                    settlementRate: { score: settlementScore, max: 40 },
                    debtVelocity: { score: debtScore, max: 30 },
                    balanceSpread: { score: spreadScore, max: 20 },
                    recentActivity: { score: activityScore, max: 10 }
                },
                suggestions,
                meta: {
                    totalExpenses: expenses.length,
                    totalSettlements: settlements.length
                }
            }
        });
    } catch (error) { next(error); }
};

module.exports = {
    getCategoryAnalytics,
    getMonthlyTrends,
    getUserStats,
    exportExpensesCsv,
    getHealthScore
};
