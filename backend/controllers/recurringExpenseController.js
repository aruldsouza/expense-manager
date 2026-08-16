const RecurringExpense = require('../models/RecurringExpense');
const Expense = require('../models/Expense');
const Group = require('../models/Group');

// ─── Helper: verify group membership ──────────────────────────────────────────
const verifyMembership = async (groupId, userId) => {
    const group = await Group.findById(groupId);
    if (!group) {
        const err = new Error('Group not found');
        err.statusCode = 404;
        throw err;
    }
    if (!group.members.map(m => m.toString()).includes(userId.toString())) {
        const err = new Error('Not authorized to access this group');
        err.statusCode = 403;
        throw err;
    }
    return group;
};

// ─── Helper: compute next run date ────────────────────────────────────────────
const computeNextRunAt = (current, frequency) => {
    const base = new Date(current);
    switch (frequency) {
        case 'daily': base.setDate(base.getDate() + 1); break;
        case 'weekly': base.setDate(base.getDate() + 7); break;
        case 'monthly': base.setMonth(base.getMonth() + 1); break;
        default: break; // custom: managed by scheduler
    }
    return base;
};

// ─── @desc Create a recurring expense ─────────────────────────────────────────
// @route POST /api/groups/:groupId/recurring
// @access Private
const createRecurringExpense = async (req, res, next) => {
    try {
        const group = await verifyMembership(req.params.groupId, req.user._id);
        const { description, amount, payer, splitType, splits, frequency, cronExpression, startDate } = req.body;

        // Validate payer is in group
        if (!group.members.map(m => m.toString()).includes(payer)) {
            res.status(400);
            throw new Error('Payer must be a member of the group');
        }

        const start = startDate ? new Date(startDate) : new Date();

        const recurring = await RecurringExpense.create({
            description,
            amount,
            group: req.params.groupId,
            payer,
            splitType: splitType || 'EQUAL',
            splits: splits || [],
            frequency,
            cronExpression: frequency === 'custom' ? cronExpression : null,
            startDate: start,
            nextRunAt: start,
            createdBy: req.user._id
        });

        await recurring.populate('payer', 'name email');
        await recurring.populate('createdBy', 'name email');

        res.status(201).json({ success: true, data: recurring });
    } catch (error) {
        next(error);
    }
};

// ─── @desc Get all recurring expenses for a group ────────────────────────────
// @route GET /api/groups/:groupId/recurring
// @access Private
const getRecurringExpenses = async (req, res, next) => {
    try {
        await verifyMembership(req.params.groupId, req.user._id);

        const recurring = await RecurringExpense.find({ group: req.params.groupId })
            .populate('payer', 'name email')
            .populate('createdBy', 'name email')
            .populate('splits.user', 'name email')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: recurring.length, data: recurring });
    } catch (error) {
        next(error);
    }
};

// ─── @desc Get single recurring expense ──────────────────────────────────────
// @route GET /api/groups/:groupId/recurring/:id
// @access Private
const getRecurringExpenseById = async (req, res, next) => {
    try {
        await verifyMembership(req.params.groupId, req.user._id);

        const recurring = await RecurringExpense.findOne({
            _id: req.params.id,
            group: req.params.groupId
        })
            .populate('payer', 'name email')
            .populate('createdBy', 'name email')
            .populate('splits.user', 'name email');

        if (!recurring) {
            res.status(404);
            throw new Error('Recurring expense not found');
        }

        res.json({ success: true, data: recurring });
    } catch (error) {
        next(error);
    }
};

// ─── @desc Update a recurring expense ────────────────────────────────────────
// @route PUT /api/groups/:groupId/recurring/:id
// @access Private
const updateRecurringExpense = async (req, res, next) => {
    try {
        await verifyMembership(req.params.groupId, req.user._id);

        const recurring = await RecurringExpense.findOne({
            _id: req.params.id,
            group: req.params.groupId
        });

        if (!recurring) {
            res.status(404);
            throw new Error('Recurring expense not found');
        }

        // Only creator can update
        if (recurring.createdBy.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Not authorized to update this recurring expense');
        }

        const allowed = ['description', 'amount', 'payer', 'splitType', 'splits', 'frequency', 'cronExpression', 'startDate', 'nextRunAt'];
        allowed.forEach(field => {
            if (req.body[field] !== undefined) {
                recurring[field] = req.body[field];
            }
        });

        await recurring.save();
        await recurring.populate('payer', 'name email');
        await recurring.populate('createdBy', 'name email');

        res.json({ success: true, data: recurring });
    } catch (error) {
        next(error);
    }
};

// ─── @desc Delete a recurring expense ────────────────────────────────────────
// @route DELETE /api/groups/:groupId/recurring/:id
// @access Private
const deleteRecurringExpense = async (req, res, next) => {
    try {
        await verifyMembership(req.params.groupId, req.user._id);

        const recurring = await RecurringExpense.findOne({
            _id: req.params.id,
            group: req.params.groupId
        });

        if (!recurring) {
            res.status(404);
            throw new Error('Recurring expense not found');
        }

        if (recurring.createdBy.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Not authorized to delete this recurring expense');
        }

        await recurring.deleteOne();
        res.json({ success: true, data: {} });
    } catch (error) {
        next(error);
    }
};

// ─── @desc Pause a recurring expense ─────────────────────────────────────────
// @route PATCH /api/groups/:groupId/recurring/:id/pause
// @access Private
const pauseRecurringExpense = async (req, res, next) => {
    try {
        await verifyMembership(req.params.groupId, req.user._id);

        const recurring = await RecurringExpense.findOneAndUpdate(
            { _id: req.params.id, group: req.params.groupId },
            { status: 'paused' },
            { new: true }
        ).populate('payer', 'name email');

        if (!recurring) {
            res.status(404);
            throw new Error('Recurring expense not found');
        }

        res.json({ success: true, data: recurring });
    } catch (error) {
        next(error);
    }
};

// ─── @desc Resume a recurring expense ────────────────────────────────────────
// @route PATCH /api/groups/:groupId/recurring/:id/resume
// @access Private
const resumeRecurringExpense = async (req, res, next) => {
    try {
        await verifyMembership(req.params.groupId, req.user._id);

        const recurring = await RecurringExpense.findOne({
            _id: req.params.id,
            group: req.params.groupId
        });

        if (!recurring) {
            res.status(404);
            throw new Error('Recurring expense not found');
        }

        // If nextRunAt is in the past, reset it to now so it fires on next tick
        if (recurring.nextRunAt < new Date()) {
            recurring.nextRunAt = new Date();
        }
        recurring.status = 'active';
        await recurring.save();
        await recurring.populate('payer', 'name email');

        res.json({ success: true, data: recurring });
    } catch (error) {
        next(error);
    }
};

// ─── Shared expense creation logic (also used by scheduler) ──────────────────
const generateExpenseFromRecurring = async (recurring) => {
    const group = await Group.findById(recurring.group);
    if (!group) return null;

    let processedSplits = [];
    const { amount, splitType, splits, payer } = recurring;

    if (splitType === 'EQUAL') {
        const splitUsers = splits && splits.length > 0
            ? splits.map(s => s.user.toString())
            : group.members.map(m => m.toString());

        const share = amount / splitUsers.length;
        processedSplits = splitUsers.map(userId => ({
            user: userId,
            amount: parseFloat(share.toFixed(2))
        }));

        const currentTotal = processedSplits.reduce((sum, s) => sum + s.amount, 0);
        const diff = amount - currentTotal;
        if (Math.abs(diff) > 0.001) processedSplits[0].amount += diff;

    } else if (splitType === 'UNEQUAL') {
        processedSplits = splits;

    } else if (splitType === 'PERCENT') {
        processedSplits = splits.map(s => ({
            user: s.user,
            amount: (amount * s.percent) / 100,
            percent: s.percent
        }));
    }

    const expense = await Expense.create({
        description: `[Recurring] ${recurring.description}`,
        amount,
        group: recurring.group,
        payer,
        splitType,
        splits: processedSplits
    });

    return expense;
};

module.exports = {
    createRecurringExpense,
    getRecurringExpenses,
    getRecurringExpenseById,
    updateRecurringExpense,
    deleteRecurringExpense,
    pauseRecurringExpense,
    resumeRecurringExpense,
    generateExpenseFromRecurring
};
