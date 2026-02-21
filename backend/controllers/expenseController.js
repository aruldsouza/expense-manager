const Expense = require('../models/Expense');
const ExpenseHistory = require('../models/ExpenseHistory');
const Group = require('../models/Group');
const Settlement = require('../models/Settlement');
const { cloudinary } = require('../middleware/upload');
const { getIO } = require('../socket');
const { createNotifications } = require('../utils/notificationHelper');

// @desc    Add new expense to group
// @route   POST /api/groups/:groupId/expenses
// @access  Private
const addExpense = async (req, res, next) => {
    try {
        // FormData sends splits as JSON string — parse if needed
        let { description, amount, payer, splitType, category } = req.body;
        let splits = req.body.splits;
        if (typeof splits === 'string') {
            try { splits = JSON.parse(splits); } catch { splits = []; }
        }
        const groupId = req.params.groupId;

        // Validation: Check if group exists
        const group = await Group.findById(groupId);
        if (!group) {
            res.status(404);
            throw new Error('Group not found');
        }

        // Validation: Verify membership
        if (!group.members.includes(req.user._id)) {
            res.status(403);
            throw new Error('Not authorized to add expense to this group');
        }

        // Validation: Payer must be in group
        if (!group.members.includes(payer)) {
            res.status(400);
            throw new Error('Payer must be a member of the group');
        }

        let processedSplits = [];

        // Split Logic
        if (splitType === 'EQUAL') {
            let splitUsers = [];

            if (splits && splits.length > 0) {
                // Check if it's an array of objects ({user: id}) or just ids
                splitUsers = splits.map(s => s.user ? s.user.toString() : s.toString());
            } else {
                splitUsers = group.members.filter(m => m).map(m => m.toString());
            }

            const share = amount / splitUsers.length;

            processedSplits = splitUsers.map(userId => ({
                user: userId,
                amount: parseFloat(share.toFixed(2))
            }));

            // Adjust for rounding errors
            const currentTotal = processedSplits.reduce((sum, s) => sum + s.amount, 0);
            const diff = amount - currentTotal;
            if (Math.abs(diff) > 0.001) {
                processedSplits[0].amount += diff;
            }

        } else if (splitType === 'UNEQUAL') {
            const totalSplit = splits.reduce((sum, s) => sum + Number(s.amount), 0);
            if (Math.abs(totalSplit - amount) > 0.01) {
                res.status(400);
                throw new Error(`Splits sum (${totalSplit}) does not match total amount (${amount})`);
            }
            processedSplits = splits;

        } else if (splitType === 'PERCENT') {
            const totalPercent = splits.reduce((sum, s) => sum + Number(s.percent), 0);
            if (Math.abs(totalPercent - 100) > 0.01) {
                res.status(400);
                throw new Error('Percentages must add up to 100%');
            }

            processedSplits = splits.map(split => ({
                user: split.user,
                amount: (amount * split.percent) / 100,
                percent: split.percent
            }));
        }

        const expense = await Expense.create({
            description,
            amount,
            group: groupId,
            payer,
            splitType,
            splits: processedSplits,
            category: category || 'Other',
            receiptUrl: req.file ? req.file.path : null,
            receiptPublicId: req.file ? req.file.filename : null
        });

        res.status(201).json({
            success: true,
            data: expense
        });

        // Emit to other group members after response sent
        try {
            const populated = await Expense.findById(expense._id)
                .populate('payer', 'name email')
                .populate('splits.user', 'name');
            getIO().to(`group:${groupId}`).emit('expense:new', populated);

            // Notify all members except the payer
            const recipients = group.members
                .map(m => m.toString())
                .filter(id => id !== payer.toString());
            if (recipients.length > 0) {
                await createNotifications(
                    recipients,
                    'expense:new',
                    `${populated.payer?.name || 'Someone'} added "${description}" — ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}`,
                    { groupId, relatedId: expense._id }
                );
            }
        } catch (e) {
            console.warn('Socket/notification emit failed:', e.message);
        }

    } catch (error) {
        next(error);
    }
};

// @desc    Get all expenses for a group
// @route   GET /api/groups/:groupId/expenses
// @access  Private
const getGroupExpenses = async (req, res, next) => {
    try {
        const groupId = req.params.groupId;

        const group = await Group.findById(groupId);
        if (!group) {
            res.status(404);
            throw new Error('Group not found');
        }

        if (!group.members.includes(req.user._id)) {
            res.status(403);
            throw new Error('Not authorized to access expenses for this group');
        }

        const expenses = await Expense.find({ group: groupId })
            .populate('payer', 'name email')
            .populate('splits.user', 'name email')
            .sort({ date: -1 });

        res.json({
            success: true,
            count: expenses.length,
            data: expenses
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Edit an expense and log history
// @route   PUT /api/groups/:groupId/expenses/:id
// @access  Private (Member)
const editExpense = async (req, res, next) => {
    try {
        const { groupId, id } = req.params;
        let { description, amount, payer, splitType, category } = req.body;
        let splits = req.body.splits;
        if (typeof splits === 'string') {
            try { splits = JSON.parse(splits); } catch { splits = []; }
        }

        const group = await Group.findById(groupId);
        if (!group) { res.status(404); throw new Error('Group not found'); }

        const expense = await Expense.findById(id);
        if (!expense) { res.status(404); throw new Error('Expense not found'); }

        // Must be in the right group
        if (expense.group.toString() !== groupId) {
            res.status(400); throw new Error('Expense does not belong to this group');
        }

        // Restrict editing if a settlement has occurred in this group AFTER the expense was created
        // (Because editing past expenses changes past balances that were assumed settled)
        const recentSettlement = await Settlement.findOne({
            group: groupId,
            createdAt: { $gt: expense.createdAt }
        });

        if (recentSettlement) {
            res.status(400);
            throw new Error('Cannot edit this expense because a settlement was recorded after it. Please delete the recent settlement first.');
        }

        // Payer must be in group
        if (payer && !group.members.some(m => (m.user ? m.user.toString() === payer : m.toString() === payer))) {
            res.status(400); throw new Error('Payer must be a member of the group');
        }

        let processedSplits = [];
        // Split Logic (same as addExpense)
        if (splitType === 'EQUAL') {
            let splitUsers = [];
            if (splits && splits.length > 0) {
                splitUsers = splits.map(s => s.user ? s.user.toString() : s.toString());
            } else {
                splitUsers = group.members.map(m => m.user ? m.user.toString() : m.toString());
            }

            const share = amount / splitUsers.length;
            processedSplits = splitUsers.map(userId => ({
                user: userId,
                amount: parseFloat(share.toFixed(2))
            }));

            const currentTotal = processedSplits.reduce((sum, s) => sum + s.amount, 0);
            const diff = amount - currentTotal;
            if (Math.abs(diff) > 0.001) processedSplits[0].amount += diff;

        } else if (splitType === 'UNEQUAL') {
            const totalSplit = splits.reduce((sum, s) => sum + Number(s.amount), 0);
            if (Math.abs(totalSplit - amount) > 0.01) {
                res.status(400); throw new Error(`Splits sum (${totalSplit}) does not match total amount (${amount})`);
            }
            processedSplits = splits;

        } else if (splitType === 'PERCENT') {
            const totalPercent = splits.reduce((sum, s) => sum + Number(s.percent), 0);
            if (Math.abs(totalPercent - 100) > 0.01) {
                res.status(400); throw new Error('Percentages must add up to 100%');
            }
            processedSplits = splits.map(split => ({
                user: split.user,
                amount: (amount * split.percent) / 100,
                percent: split.percent
            }));
        }

        // Snapshot old values before update
        const oldValues = {
            description: expense.description,
            amount: expense.amount,
            payer: expense.payer.toString(),
            splitType: expense.splitType,
            category: expense.category,
            splits: expense.splits.map(s => ({ user: s.user.toString(), amount: s.amount, percent: s.percent }))
        };

        // Apply new values
        expense.description = description || expense.description;
        expense.amount = amount || expense.amount;
        expense.payer = payer || expense.payer;
        expense.splitType = splitType || expense.splitType;
        expense.category = category || expense.category;
        expense.splits = processedSplits.length > 0 ? processedSplits : expense.splits;

        if (req.file) {
            // Delete old receipt from Cloudinary if replacing
            if (expense.receiptPublicId) {
                try {
                    await cloudinary.uploader.destroy(expense.receiptPublicId, { resource_type: 'auto' });
                } catch (e) { console.warn('Cloudinary destroy warning:', e.message); }
            }
            expense.receiptUrl = req.file.path;
            expense.receiptPublicId = req.file.filename;
        }

        await expense.save();

        const newValues = {
            description: expense.description,
            amount: expense.amount,
            payer: expense.payer.toString(),
            splitType: expense.splitType,
            category: expense.category,
            splits: expense.splits.map(s => ({ user: s.user.toString(), amount: s.amount, percent: s.percent }))
        };

        // Save Audit History
        await ExpenseHistory.create({
            expense: expense._id,
            group: groupId,
            editedBy: req.user._id,
            oldValues,
            newValues
        });

        res.json({ success: true, data: expense });

        // Emit update
        try {
            const populated = await Expense.findById(expense._id)
                .populate('payer', 'name email')
                .populate('splits.user', 'name');
            getIO().to(`group:${groupId}`).emit('expense:updated', populated);
        } catch (e) { console.warn('Socket emit expense:updated failed:', e.message); }

    } catch (error) { next(error); }
};

// @desc    Get edit history for an expense
// @route   GET /api/groups/:groupId/expenses/:id/history
// @access  Private (Viewer)
const getExpenseHistory = async (req, res, next) => {
    try {
        const history = await ExpenseHistory.find({ expense: req.params.id })
            .populate('editedBy', 'name email')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: history.length, data: history });
    } catch (error) { next(error); }
};

// @desc    Delete an expense
// @route   DELETE /api/groups/:groupId/expenses/:id
// @access  Private (Member)
const deleteExpense = async (req, res, next) => {
    try {
        const { groupId, id } = req.params;

        const group = await Group.findById(groupId);
        if (!group) { res.status(404); throw new Error('Group not found'); }

        const expense = await Expense.findById(id);
        if (!expense) { res.status(404); throw new Error('Expense not found'); }

        // Must be in the right group
        if (expense.group.toString() !== groupId) {
            res.status(400); throw new Error('Expense does not belong to this group');
        }

        // Restrict deleting if a settlement has occurred in this group AFTER the expense was created
        const recentSettlement = await Settlement.findOne({
            group: groupId,
            createdAt: { $gt: expense.createdAt }
        });

        if (recentSettlement) {
            res.status(400);
            throw new Error('Cannot delete this expense because a settlement was recorded after it. Please delete the recent settlement first.');
        }

        // Delete receipt from Cloudinary if it exists
        if (expense.receiptPublicId) {
            try {
                await cloudinary.uploader.destroy(expense.receiptPublicId, { resource_type: 'auto' });
            } catch (e) { console.warn('Cloudinary destroy warning:', e.message); }
        }

        await expense.deleteOne();

        // Also delete associated history logs to clean up
        await ExpenseHistory.deleteMany({ expense: id });

        res.json({ success: true, data: {} });

        try {
            getIO().to(`group:${groupId}`).emit('expense:deleted', id);
        } catch (e) {
            console.warn('Socket emit expense:deleted failed:', e.message);
        }
    } catch (error) { next(error); }
};

module.exports = {
    addExpense,
    getGroupExpenses,
    editExpense,
    getExpenseHistory,
    deleteExpense,
    deleteReceipt
};

// @desc  Delete receipt from an expense
// @route DELETE /api/groups/:groupId/expenses/:id/receipt
// @access Private
async function deleteReceipt(req, res, next) {
    try {
        const expense = await Expense.findById(req.params.id);
        if (!expense) { res.status(404); throw new Error('Expense not found'); }
        if (expense.group.toString() !== req.params.groupId) { res.status(403); throw new Error('Not authorized'); }

        // Remove from Cloudinary if we have a publicId
        if (expense.receiptPublicId) {
            try {
                await cloudinary.uploader.destroy(expense.receiptPublicId, { resource_type: 'auto' });
            } catch (e) {
                console.warn('Cloudinary destroy warning:', e.message);
            }
        }

        expense.receiptUrl = null;
        expense.receiptPublicId = null;
        await expense.save();

        res.json({ success: true, data: expense });
    } catch (error) { next(error); }
}
