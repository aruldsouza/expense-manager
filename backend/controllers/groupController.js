const Group = require('../models/Group');
const User = require('../models/User');

exports.createGroup = async (req, res, next) => {
  try {
    const { name, description, memberEmails } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const membersSet = new Set([req.user.id]);

    if (Array.isArray(memberEmails) && memberEmails.length > 0) {
      for (const email of memberEmails) {
        if (email && email.trim()) {
          const user = await User.findOne({ email: email.trim().toLowerCase() });
          if (user) {
            membersSet.add(user._id.toString());
          }
        }
      }
    }

    const group = await Group.create({
      name,
      description: description || '',
      createdBy: req.user.id,
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
    const groups = await Group.find({ members: req.user.id })
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
    const group = await Group.findById(groupId)
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some(m => m._id.toString() === req.user.id);
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

    if (group.members.includes(userToAdd._id)) {
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
