const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const Group = require('../models/Group');
const { CATEGORIES } = require('../models/Budget');
const { createNotifications } = require('../utils/notificationHelper');

// Helper: verify group membership
const verifyMembership = async (groupId, userId) => {
    const group = await Group.findById(groupId);
    if (!group) { const e = new Error('Group not found'); e.statusCode = 404; throw e; }
    if (!group.members.some(m => m.toString() === userId.toString())) {
        const e = new Error('Not authorized'); e.statusCode = 403; throw e;
    }
    return group;
};

// Helper: get current YYYY-MM
const currentMonthYear = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// ─── Budget CRUD ─────────────────────────────────────────────────────────────

// @desc  Create or update (upsert) a budget for a group/category/month
// @route POST /api/groups/:groupId/budgets
// @access Private
const upsertBudget = async (req, res, next) => {
    try {
        await verifyMembership(req.params.groupId, req.user._id);
        const { category, monthYear, limit } = req.body;
        const my = monthYear || currentMonthYear();

        const budget = await Budget.findOneAndUpdate(
            { group: req.params.groupId, category, monthYear: my },
            { limit, createdBy: req.user._id, group: req.params.groupId, category, monthYear: my },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );
        res.status(201).json({ success: true, data: budget });

        // Check if current spending already exceeds the new budget limit
        try {
            const my = budget.monthYear;
            const [year, month] = my.split('-').map(Number);
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 1);
            const agg = await Expense.aggregate([
                { $match: { group: require('mongoose').Types.ObjectId.createFromHexString(req.params.groupId), category: budget.category, date: { $gte: startDate, $lt: endDate } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const spent = agg[0]?.total || 0;
            if (spent > budget.limit) {
                await createNotifications(
                    [budget.createdBy.toString()],
                    'budget:exceeded',
                    `⚠️ Budget exceeded: ${budget.category} spent ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(spent)} of ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(budget.limit)} limit`,
                    { groupId: req.params.groupId, relatedId: budget._id }
                );
            }
        } catch (e) {
            console.warn('Budget notification error:', e.message);
        }
    } catch (error) {
        next(error);
    }
};

// @desc  List budgets for a group (default: current month)
// @route GET /api/groups/:groupId/budgets?month=2026-02
// @access Private
const getBudgets = async (req, res, next) => {
    try {
        await verifyMembership(req.params.groupId, req.user._id);
        const monthYear = req.query.month || currentMonthYear();
        const budgets = await Budget.find({ group: req.params.groupId, monthYear });
        res.json({ success: true, data: budgets, monthYear });
    } catch (error) {
        next(error);
    }
};

// @desc  Update budget limit
// @route PUT /api/groups/:groupId/budgets/:id
// @access Private
const updateBudget = async (req, res, next) => {
    try {
        await verifyMembership(req.params.groupId, req.user._id);
        const budget = await Budget.findOneAndUpdate(
            { _id: req.params.id, group: req.params.groupId },
            { limit: req.body.limit },
            { new: true, runValidators: true }
        );
        if (!budget) { res.status(404); throw new Error('Budget not found'); }
        res.json({ success: true, data: budget });
    } catch (error) {
        next(error);
    }
};

// @desc  Delete a budget
// @route DELETE /api/groups/:groupId/budgets/:id
// @access Private
const deleteBudget = async (req, res, next) => {
    try {
        await verifyMembership(req.params.groupId, req.user._id);
        const budget = await Budget.findOneAndDelete({ _id: req.params.id, group: req.params.groupId });
        if (!budget) { res.status(404); throw new Error('Budget not found'); }
        res.json({ success: true, data: {} });
    } catch (error) {
        next(error);
    }
};

// ─── Analytics ───────────────────────────────────────────────────────────────

// @desc  Budget vs actual spending — with "exceeded" warnings
// @route GET /api/groups/:groupId/analytics/budget-status?month=2026-02
// @access Private
const getBudgetStatus = async (req, res, next) => {
    try {
        await verifyMembership(req.params.groupId, req.user._id);
        const monthYear = req.query.month || currentMonthYear();
        const [year, month] = monthYear.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);

        const [budgets, spending] = await Promise.all([
            Budget.find({ group: req.params.groupId, monthYear }),
            Expense.aggregate([
                { $match: { group: require('mongoose').Types.ObjectId.createFromHexString(req.params.groupId), date: { $gte: startDate, $lt: endDate } } },
                { $group: { _id: '$category', total: { $sum: '$amount' } } }
            ])
        ]);

        const spendingMap = {};
        spending.forEach(s => { spendingMap[s._id || 'Other'] = s.total; });

        const result = budgets.map(b => {
            const spent = parseFloat((spendingMap[b.category] || 0).toFixed(2));
            const remaining = parseFloat((b.limit - spent).toFixed(2));
            const pct = b.limit > 0 ? Math.min(100, Math.round((spent / b.limit) * 100)) : 0;
            return {
                _id: b._id,
                category: b.category,
                limit: b.limit,
                spent,
                remaining,
                percentUsed: pct,
                exceeded: spent > b.limit,
                monthYear: b.monthYear
            };
        });

        const anyExceeded = result.some(r => r.exceeded);
        res.json({ success: true, data: result, anyExceeded, monthYear });
    } catch (error) {
        next(error);
    }
};

module.exports = { upsertBudget, getBudgets, updateBudget, deleteBudget, getBudgetStatus };
