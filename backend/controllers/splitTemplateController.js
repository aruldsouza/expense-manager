const SplitTemplate = require('../models/SplitTemplate');
const Group = require('../models/Group');

// Helper: verify group membership
const verifyMembership = async (groupId, userId) => {
    const group = await Group.findById(groupId);
    if (!group) { const e = new Error('Group not found'); e.statusCode = 404; throw e; }
    const isMember = group.members.some(m =>
        m.user ? m.user.toString() === userId.toString() : m.toString() === userId.toString()
    );
    if (!isMember) { const e = new Error('Not authorized'); e.statusCode = 403; throw e; }
    return group;
};

// @desc  Get all split templates for a group (favorites first)
// @route GET /api/groups/:groupId/templates
// @access Private (Viewer)
const getTemplates = async (req, res, next) => {
    try {
        await verifyMembership(req.params.groupId, req.user._id);
        const templates = await SplitTemplate.find({ group: req.params.groupId })
            .populate('createdBy', 'name')
            .populate('involvedMembers', 'name')
            .populate('splits.user', 'name')
            .populate('defaultPayer', 'name')
            .sort({ isFavorite: -1, createdAt: -1 });
        res.json({ success: true, data: templates });
    } catch (error) { next(error); }
};

// @desc  Create a split template
// @route POST /api/groups/:groupId/templates
// @access Private (Member)
const createTemplate = async (req, res, next) => {
    try {
        await verifyMembership(req.params.groupId, req.user._id);
        const { name, splitType, involvedMembers, splits, defaultPayer } = req.body;

        if (!name || !splitType) {
            res.status(400); throw new Error('name and splitType are required');
        }

        const template = await SplitTemplate.create({
            group: req.params.groupId,
            createdBy: req.user._id,
            name,
            splitType,
            involvedMembers: involvedMembers || [],
            splits: splits || [],
            defaultPayer: defaultPayer || null,
            isFavorite: false
        });

        const populated = await SplitTemplate.findById(template._id)
            .populate('createdBy', 'name')
            .populate('involvedMembers', 'name')
            .populate('splits.user', 'name')
            .populate('defaultPayer', 'name');

        res.status(201).json({ success: true, data: populated });
    } catch (error) { next(error); }
};

// @desc  Update a split template (name, favorite)
// @route PUT /api/groups/:groupId/templates/:id
// @access Private (Member)
const updateTemplate = async (req, res, next) => {
    try {
        await verifyMembership(req.params.groupId, req.user._id);
        const { name, splitType, involvedMembers, splits, defaultPayer, isFavorite } = req.body;

        const template = await SplitTemplate.findOneAndUpdate(
            { _id: req.params.id, group: req.params.groupId },
            { $set: { name, splitType, involvedMembers, splits, defaultPayer, isFavorite } },
            { new: true, runValidators: true }
        )
            .populate('createdBy', 'name')
            .populate('involvedMembers', 'name')
            .populate('splits.user', 'name')
            .populate('defaultPayer', 'name');

        if (!template) { res.status(404); throw new Error('Template not found'); }
        res.json({ success: true, data: template });
    } catch (error) { next(error); }
};

// @desc  Toggle favorite on a template
// @route PATCH /api/groups/:groupId/templates/:id/favorite
// @access Private (Member)
const toggleFavorite = async (req, res, next) => {
    try {
        await verifyMembership(req.params.groupId, req.user._id);
        const template = await SplitTemplate.findOne({ _id: req.params.id, group: req.params.groupId });
        if (!template) { res.status(404); throw new Error('Template not found'); }

        template.isFavorite = !template.isFavorite;
        await template.save();
        res.json({ success: true, data: { isFavorite: template.isFavorite } });
    } catch (error) { next(error); }
};

// @desc  Delete a split template
// @route DELETE /api/groups/:groupId/templates/:id
// @access Private (Member)
const deleteTemplate = async (req, res, next) => {
    try {
        await verifyMembership(req.params.groupId, req.user._id);
        const template = await SplitTemplate.findOneAndDelete({ _id: req.params.id, group: req.params.groupId });
        if (!template) { res.status(404); throw new Error('Template not found'); }
        res.json({ success: true, data: {} });
    } catch (error) { next(error); }
};

module.exports = { getTemplates, createTemplate, updateTemplate, toggleFavorite, deleteTemplate };
