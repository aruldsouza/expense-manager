const Group = require('../models/Group');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Notification = require('../models/Notification');
const { sendGroupInviteEmail } = require('../utils/mailer');

exports.createGroup = async (req, res, next) => {
  try {
    const { name, description, memberEmails, members } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const userId = req.user.id || req.user._id;
    const inviterName = req.user.name || 'Group Creator';
    const inviterEmail = req.user.email || '';
    const membersSet = new Set([userId.toString()]);
    const invitedEmailsList = [];

    const itemsToProcess = [];
    if (Array.isArray(memberEmails)) {
      itemsToProcess.push(...memberEmails);
    } else if (typeof memberEmails === 'string') {
      itemsToProcess.push(...memberEmails.split(','));
    }

    if (Array.isArray(members)) {
      itemsToProcess.push(...members);
    } else if (typeof members === 'string') {
      itemsToProcess.push(...members.split(','));
    }

    for (const item of itemsToProcess) {
      if (!item) continue;
      const strVal = typeof item === 'string' ? item.trim() : (item._id || item.id || item.email || item).toString().trim();
      if (!strVal) continue;

      if (strVal.includes('@')) {
        const cleanEmail = strVal.toLowerCase();
        if (cleanEmail === inviterEmail.toLowerCase()) continue;

        let user = await User.findOne({ email: cleanEmail });
        if (!user) {
          // Create placeholder user so they are immediately part of the group
          const defaultName = cleanEmail.split('@')[0];
          user = await User.create({
            name: defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
            email: cleanEmail,
            password: 'placeholder_pending_registration_' + Date.now()
          });
        }
        if (user) {
          membersSet.add(user._id.toString());
          invitedEmailsList.push({ email: cleanEmail, userId: user._id });
        }
      } else {
        const user = await User.findById(strVal);
        if (user) {
          membersSet.add(user._id.toString());
          if (user.email) invitedEmailsList.push({ email: user.email, userId: user._id });
        }
      }
    }

    const group = await Group.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      createdBy: userId,
      members: Array.from(membersSet)
    });

    const populatedGroup = await Group.findById(group._id)
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    // Asynchronously dispatch email invites & create in-app notifications
    for (const invited of invitedEmailsList) {
      // 1. Send Email
      sendGroupInviteEmail({
        toEmail: invited.email,
        inviterName,
        inviterEmail,
        groupName: group.name,
        groupDescription: group.description,
        groupId: group._id
      }).catch(e => console.warn('Email invite dispatch error:', e.message));

      // 2. Create in-app notification
      Notification.create({
        recipient: invited.userId,
        type: 'group:invite',
        message: `${inviterName} invited you to join the expense group "${group.name}".`,
        groupId: group._id
      }).catch(() => {});
    }

    res.status(201).json(populatedGroup);
  } catch (err) {
    next(err);
  }
};

exports.getUserGroups = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const userEmail = (req.user.email || '').toLowerCase().trim();

    // Query groups where user is in members array OR user is creator
    const groups = await Group.find({
      $or: [
        { members: userId },
        { createdBy: userId }
      ]
    })
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

    const isMember = group.members.some(m => (m._id || m).toString() === userId.toString()) ||
                     group.createdBy?._id?.toString() === userId.toString();
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
    const { email, userId: targetUserId } = req.body;

    if (!email && !targetUserId) {
      return res.status(400).json({ error: 'User email or userId is required' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    let userToAdd = null;
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      userToAdd = await User.findOne({ email: cleanEmail });
      if (!userToAdd) {
        // Auto-create placeholder user
        const defaultName = cleanEmail.split('@')[0];
        userToAdd = await User.create({
          name: defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
          email: cleanEmail,
          password: 'placeholder_pending_registration_' + Date.now()
        });
      }
    } else if (targetUserId) {
      userToAdd = await User.findById(targetUserId);
    }

    if (!userToAdd) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (group.members.some(m => m.toString() === userToAdd._id.toString())) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    group.members.push(userToAdd._id);
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    const inviterName = req.user.name || 'Group Admin';
    const inviterEmail = req.user.email || '';

    // Send email invitation asynchronously
    if (userToAdd.email) {
      sendGroupInviteEmail({
        toEmail: userToAdd.email,
        inviterName,
        inviterEmail,
        groupName: updatedGroup.name,
        groupDescription: updatedGroup.description,
        groupId: updatedGroup._id
      }).catch(e => console.warn('Email invite dispatch error:', e.message));
    }

    // Create in-app notification
    Notification.create({
      recipient: userToAdd._id,
      type: 'group:invite',
      message: `${inviterName} invited you to join the expense group "${updatedGroup.name}".`,
      groupId: updatedGroup._id
    }).catch(() => {});

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

