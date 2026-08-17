const Group = require('../models/Group');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');

exports.createGroup = async (req, res, next) => {
  try {
    const { name, description, memberEmails, members } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const userId = req.user.id || req.user._id;
    const membersSet = new Set([userId.toString()]);

    const itemsToProcess = [];
    if (Array.isArray(memberEmails)) itemsToProcess.push(...memberEmails);
    if (Array.isArray(members)) itemsToProcess.push(...members);

    for (const item of itemsToProcess) {
      if (!item) continue;
      const strVal = typeof item === 'string' ? item.trim() : (item._id || item.id || item).toString();
      if (strVal.includes('@')) {
        const user = await User.findOne({ email: strVal.toLowerCase() });
        if (user) membersSet.add(user._id.toString());
      } else {
        const user = await User.findById(strVal);
        if (user) membersSet.add(user._id.toString());
      }
    }

    const group = await Group.create({
      name,
      description: description || '',
      createdBy: userId,
      members: Array.from(membersSet)
    });

    const populatedGroup = await Group.findById(group._id).populate('members', 'name email');

    res.status(201).json(populatedGroup);
  } catch (err) {
    next(err);
  }
};

exports.getUserGroups = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const groups = await Group.find({ members: userId })
      .populate('members', 'name email')
      .populate('createdBy', 'name email')
      .sort({ updatedAt: -1 });

    res.json(groups);
  } catch (err) {
    next(err);
  }
};

exports.getGroupById = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id || req.user._id;
    const group = await Group.findById(groupId)
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some(m => (m._id || m).toString() === userId.toString());
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
    }

    res.json(group);
  } catch (err) {
    next(err);
  }
};

exports.addMember = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'User email is required' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const userToAdd = await User.findOne({ email: email.trim().toLowerCase() });
    if (!userToAdd) {
      return res.status(404).json({ error: 'User not found with this email' });
    }

    if (group.members.some(m => m.toString() === userToAdd._id.toString())) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    group.members.push(userToAdd._id);
    await group.save();

    const updatedGroup = await Group.findById(groupId).populate('members', 'name email');
    res.json(updatedGroup);
  } catch (err) {
    next(err);
  }
};

exports.deleteGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id || req.user._id;
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only group creator can delete this group' });
    }

    await Group.findByIdAndDelete(groupId);
    await Expense.deleteMany({ group: groupId });
    await Settlement.deleteMany({ group: groupId });

    res.json({ message: 'Group deleted successfully' });
  } catch (err) {
    next(err);
  }
};

