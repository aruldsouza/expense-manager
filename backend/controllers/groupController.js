const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');

// Helper: check if a user is in the members array (handles legacy ObjectId strings and new {user, role} format)
const isMember = (members, userId) => {
    return members.some(m => {
        if (m.user) return m.user.toString() === userId.toString();
        return m.toString() === userId.toString();
    });
};

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res, next) => {
    try {
        const { name, description, type, currency, members } = req.body;

        // Process initial members (invitees)
        const initialMembers = (members || []).map(id => ({
            user: id,
            role: 'Member' // Invited users default to Member
        }));

        // Add creator as Admin
        initialMembers.push({
            user: req.user._id,
            role: 'Admin'
        });

        // Deduplicate by user ID
        const uniqueMembersMap = new Map();
        initialMembers.forEach(m => uniqueMembersMap.set(m.user.toString(), m));
        const finalMembers = Array.from(uniqueMembersMap.values());

        const group = new Group({
            name,
            description,
            type,
            currency,
            creator: req.user._id,
            members: finalMembers
        });

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
        // Find groups where the current user is in the members array.
        // Matches legacy [userId] or new [{user: userId}]
        const groups = await Group.find({
            $or: [
                { members: req.user._id }, // legacy
                { 'members.user': req.user._id } // new format
            ]
        }).sort({ updatedAt: -1 });

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
            .populate('members.user', 'name email') // new format
            .populate('creator', 'name email');

        if (!group) {
            res.status(404);
            throw new Error('Group not found');
        }

        // Check membership
        if (!isMember(group.members, req.user._id)) {
            res.status(403);
            throw new Error('Not authorized to access this group');
        }

        // Send back formatted data (normalising legacy members if any)
        const formattedGroup = group.toObject();
        formattedGroup.members = formattedGroup.members.map(m => {
            if (m.user && m.user._id) return m; // Already full object
            // Legacy string/objectId member
            return {
                user: m,
                role: m.toString() === group.creator._id.toString() ? 'Admin' : 'Member'
            };
        });

        res.json({
            success: true,
            data: formattedGroup,
            role: req.groupRole // injected by rbac middleware
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update member role
// @route   PATCH /api/groups/:groupId/members/:userId/role
// @access  Private (Admin only)
const updateRole = async (req, res, next) => {
    try {
        const { role } = req.body;
        if (!['Admin', 'Member', 'Viewer'].includes(role)) {
            res.status(400);
            throw new Error('Invalid role');
        }

        const group = await Group.findById(req.params.groupId);
        if (!group) {
            res.status(404);
            throw new Error('Group not found');
        }

        // Find the member to update
        const memberIndex = group.members.findIndex(m => {
            if (m.user) return m.user.toString() === req.params.userId;
            return m.toString() === req.params.userId;
        });

        if (memberIndex === -1) {
            res.status(404);
            throw new Error('User not found in group');
        }

        // Cannot demote the creator
        if (req.params.userId === group.creator.toString() && role !== 'Admin') {
            res.status(400);
            throw new Error('Group creator must be an Admin');
        }

        // Update role (handle migration if legacy)
        const targetMember = group.members[memberIndex];
        if (targetMember.user) {
            group.members[memberIndex].role = role;
        } else {
            // Migrate to new format
            group.members[memberIndex] = { user: targetMember, role };
        }

        await group.save();

        res.json({
            success: true,
            message: 'Role updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Remove member from group
// @route   DELETE /api/groups/:groupId/members/:userId
// @access  Private (Admin only)
const removeMember = async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.groupId);
        if (!group) { res.status(404); throw new Error('Group not found'); }

        if (req.params.userId === group.creator.toString()) {
            res.status(400); throw new Error('Cannot remove the group creator');
        }

        // Check if member exists
        if (!isMember(group.members, req.params.userId)) {
            res.status(404); throw new Error('User not found in group');
        }

        // Remove from array
        group.members = group.members.filter(m => {
            if (m.user) return m.user.toString() !== req.params.userId;
            return m.toString() !== req.params.userId;
        });

        await group.save();

        res.json({ success: true, message: 'Member removed successfully' });
    } catch (err) { next(err); }
};

// @desc    Update group settings
// @route   PUT /api/groups/:id
// @access  Private (Admin only)
const updateGroup = async (req, res, next) => {
    try {
        const { name, description, currency } = req.body;
        const group = await Group.findById(req.params.id);
        if (!group) { res.status(404); throw new Error('Group not found'); }

        if (name) group.name = name;
        if (description !== undefined) group.description = description;
        if (currency) group.currency = currency;

        await group.save();
        res.json({ success: true, data: group });
    } catch (err) { next(err); }
};

// @desc    Delete group
// @route   DELETE /api/groups/:id
// @access  Private (Admin only)
const deleteGroup = async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) {
            res.status(404);
            throw new Error('Group not found');
        }

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
    updateRole,
    removeMember,
    updateGroup,
    deleteGroup
};
