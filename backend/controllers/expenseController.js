const Expense = require('../models/Expense');
const Group = require('../models/Group');
const { cloudinary } = require('../middleware/upload');

// @desc    Add new expense to group
// @route   POST /api/groups/:groupId/expenses
// @access  Private
const addExpense = async (req, res, next) => {
    try {
        const { description, amount, payer, splitType, splits, category } = req.body;
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

module.exports = {
    addExpense,
    getGroupExpenses,
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
