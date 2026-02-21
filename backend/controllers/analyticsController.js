const Expense = require('../models/Expense');
const Group = require('../models/Group');
const { CATEGORIES } = require('../models/Budget');

// Helper: verify group membership
const verifyMembership = async (groupId, userId) => {
    const group = await Group.findById(groupId);
    if (!group) { const e = new Error('Group not found'); e.statusCode = 404; throw e; }
    if (!group.members.some(m => m.user ? m.user.toString() === userId.toString() : m.toString() === userId.toString())) {
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
        await verifyMembership(req.params.groupId, req.user._id);
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
        await verifyMembership(req.params.groupId, req.user._id);
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
        const group = await verifyMembership(req.params.groupId, req.user._id);
        const dateFilter = buildDateFilter(req.query.startDate, req.query.endDate);

        const query = { group: req.params.groupId };
        if (dateFilter) query.date = dateFilter;

        const expenses = await Expense.find(query).populate('payer', 'name').populate('splits.user', 'name');

        const userStats = {};

        // Initialize for all group members
        // group.members can be an array of ObjectIds or an array of objects
        group.members.forEach(m => {
            const id = m.user ? m.user.toString() : m.toString();
            userStats[id] = { name: 'Unknown', paid: 0, share: 0 };
        });

        expenses.forEach(e => {
            const payerId = e.payer._id.toString();
            if (!userStats[payerId]) userStats[payerId] = { name: e.payer.name, paid: 0, share: 0 };
            userStats[payerId].name = e.payer.name;
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
        await verifyMembership(req.params.groupId, req.user._id);
        const dateFilter = buildDateFilter(req.query.startDate, req.query.endDate);

        const query = { group: req.params.groupId };
        if (dateFilter) query.date = dateFilter;

        const expenses = await Expense.find(query).populate('payer', 'name email').sort({ date: -1 });

        let csv = 'Date,Description,Category,Amount,Payer,SplitType\n';
        expenses.forEach(e => {
            const date = new Date(e.date).toISOString().split('T')[0];
            const desc = `"${e.description.replace(/"/g, '""')}"`;
            const cat = e.category || 'Other';
            const amt = e.amount;
            const payer = `"${e.payer?.name || 'Unknown'}"`;
            const splitType = e.splitType;
            csv += `${date},${desc},${cat},${amt},${payer},${splitType}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="expenses_export_${Date.now()}.csv"`);
        res.send(csv);
    } catch (error) { next(error); }
};

module.exports = {
    getCategoryAnalytics,
    getMonthlyTrends,
    getUserStats,
    exportExpensesCsv
};
