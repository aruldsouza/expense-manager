const Group = require('../models/Group');

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res, next) => {
    try {
        const { name, description, type, currency, members } = req.body;

        // Create new group
        const group = new Group({
            name,
            description,
            type,
            currency,
            creator: req.user._id,
            members: [req.user._id, ...(members || [])] // Add creator to members
        });

        // Ensure unique members (in case creator is also in members array)
        group.members = [...new Set(group.members.map(m => m.toString()))];

        const createdGroup = await group.save();

        res.status(201).json({
            success: true,
            data: createdGroup
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get user's groups
// @route   GET /api/groups
// @access  Private
const getGroups = async (req, res, next) => {
    try {
        // Find groups where the current user is in the members array
        const groups = await Group.find({ members: { $in: [req.user._id] } })
            .sort({ updatedAt: -1 });

        res.json({
            success: true,
            count: groups.length,
            data: groups
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get group by ID
// @route   GET /api/groups/:id
// @access  Private
const getGroupById = async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id)
            .populate('members', 'name email')
            .populate('creator', 'name email');

        if (!group) {
            res.status(404);
            throw new Error('Group not found');
        }

        // Check if user is a member of the group
        if (!group.members.some(member => member._id.toString() === req.user._id.toString())) {
            res.status(403);
            throw new Error('Not authorized to access this group');
        }

        res.json({
            success: true,
            data: group
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete group
// @route   DELETE /api/groups/:id
// @access  Private
const deleteGroup = async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            res.status(404);
            throw new Error('Group not found');
        }

        // Only creator can delete
        if (group.creator.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Only the group creator can delete this group');
        }

        const Expense = require('../models/Expense');
        const Settlement = require('../models/Settlement');

        // Delete associated data
        await Expense.deleteMany({ group: group._id });
        await Settlement.deleteMany({ group: group._id });
        await group.deleteOne();

        res.json({
            success: true,
            data: {},
            message: 'Group deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createGroup,
    getGroups,
    getGroupById,
    deleteGroup
};
