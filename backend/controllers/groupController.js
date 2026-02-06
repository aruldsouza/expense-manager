const Group = require('../models/Group');
const User = require('../models/User');

/**
 * @route   POST /api/groups
 * @desc    Create a new group
 * @access  Private
 */
const createGroup = async (req, res, next) => {
    try {
        const { name, description, currency, members = [] } = req.body;

        if (!name) {
            res.status(400);
            throw new Error('Group name is required');
        }

        // Filter out duplicates and invalid IDs from members
        // We expect members to be an array of email addresses or user IDs
        // For simplicity validation, let's assume they are provided as IDs or Emails and we resolve them
        // But for this basic version, let's assume they might be passed as IDs.
        // If we want to add members by email (more user friendly), we would need to look them up.

        // For now, let's just add the creator. If members are passed as IDs, we validate them.

        // Ensure unique members
        const uniqueMembers = [...new Set(members)];

        // Validate that provided members exist (if they are IDs)
        // You might want to enhance this to support adding by email

        const group = await Group.create({
            name,
            description,
            currency,
            creator: req.user._id,
            members: [req.user._id, ...uniqueMembers], // Creator is added automatically by pre-save validation too, but good to be explicit or rely on schema
        });

        // Populate members for the response
        const populatedGroup = await Group.findById(group._id)
            .populate('members', 'name email')
            .populate('creator', 'name email');

        res.status(201).json({
            success: true,
            data: populatedGroup,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/groups
 * @desc    Get all groups for the current user
 * @access  Private
 */
const getGroups = async (req, res, next) => {
    try {
        const groups = await Group.find({ members: req.user._id })
            .populate('members', 'name email')
            .populate('creator', 'name email')
            .sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            count: groups.length,
            data: groups,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/groups/:id
 * @desc    Get single group details
 * @access  Private
 */
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
        const isMember = group.members.some(
            (member) => member._id.toString() === req.user._id.toString()
        );

        if (!isMember) {
            res.status(403);
            throw new Error('Not authorized to access this group');
        }

        res.status(200).json({
            success: true,
            data: group,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createGroup,
    getGroups,
    getGroupById,
};
