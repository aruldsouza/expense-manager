const Group = require('../models/Group');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Notification = require('../models/Notification');
const { sendGroupInviteEmail } = require('../utils/mailer');
const cache = require('../utils/cache');

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

    // Invalidate dashboard stats cache so dashboards update instantly
    cache.clear().catch(() => {});

    // Respond to user immediately without network delay
    res.status(201).json(populatedGroup);

    // Asynchronously dispatch email invites & create in-app notifications in background
    setImmediate(() => {
      for (const invited of invitedEmailsList) {
        sendGroupInviteEmail({
          toEmail: invited.email,
          inviterName,
          inviterEmail,
          groupName: group.name,
          groupDescription: group.description,
          groupId: group._id
        }).catch(e => console.warn('Email invite dispatch error:', e.message));

        Notification.create({
          recipient: invited.userId,
          type: 'group:invite',
          message: `${inviterName} invited you to join the expense group "${group.name}".`,
          groupId: group._id
        }).catch(() => {});
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserGroups = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    let userEmail = (req.user.email || '').toLowerCase().trim();

    if (!userEmail) {
      const activeUser = await User.findById(userId);
      if (activeUser && activeUser.email) {
        userEmail = activeUser.email.toLowerCase().trim();
      }
    }

    // 1. Find all user IDs matching this user's email (case-insensitive regex)
    const matchingUsers = userEmail
      ? await User.find({ email: { $regex: new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } })
      : await User.find({ _id: userId });

    const allUserIds = matchingUsers.map(u => u._id);
    if (!allUserIds.some(id => id.toString() === userId.toString())) {
      allUserIds.push(userId);
    }

    // 2. Query all groups where user is either in members list OR created the group
    const groups = await Group.find({
      $or: [
        { members: { $in: allUserIds } },
        { createdBy: { $in: allUserIds } }
      ]
    })
      .populate('members', 'name email')
      .populate('createdBy', 'name email')
      .sort({ updatedAt: -1 });

    // 3. Auto-heal: Ensure current active userId is in the group.members array
    for (const group of groups) {
      let needsSave = false;
      const rawMemberIds = group.members.map(m => {
        const mEmail = (m.email || '').toLowerCase().trim();
        if (userEmail && mEmail === userEmail && m._id && m._id.toString() !== userId.toString()) {
          needsSave = true;
          return userId;
        }
        return m._id || m;
      });

      if (!rawMemberIds.some(id => id.toString() === userId.toString())) {
        rawMemberIds.push(userId);
        needsSave = true;
      }

      if (needsSave) {
        group.members = rawMemberIds;
        await group.save();
      }
    }

    // Return populated groups
    const populatedGroups = await Group.find({
      $or: [
        { members: { $in: allUserIds } },
        { createdBy: { $in: allUserIds } }
      ]
    })
      .populate('members', 'name email')
      .populate('createdBy', 'name email')
      .sort({ updatedAt: -1 });

    res.json(populatedGroups);
  } catch (err) {
    next(err);
  }
};

exports.getGroupById = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id || req.user._id;
    const userEmail = (req.user.email || '').toLowerCase().trim();

    const group = await Group.findById(groupId)
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some(m => {
      const mId = (m._id || m).toString();
      const mEmail = (m.email || '').toLowerCase().trim();
      return mId === userId.toString() || (userEmail && mEmail === userEmail);
    }) || group.createdBy?._id?.toString() === userId.toString();

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
        // Auto-create placeholder user so they are immediately part of the group
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

    // Check if user is already a member
    const alreadyMember = group.members.some(m => m.toString() === userToAdd._id.toString());
    if (!alreadyMember) {
      group.members.push(userToAdd._id);
      await group.save();
    }

    const updatedGroup = await Group.findById(groupId)
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    const inviterName = req.user.name || 'Group Admin';
    const inviterEmail = req.user.email || '';

    // Invalidate dashboard stats cache so dashboards update instantly
    cache.clear().catch(() => {});

    // Respond immediately
    res.json(updatedGroup);

    // Send email invitation and create notifications asynchronously in background
    setImmediate(() => {
      if (userToAdd.email && !alreadyMember) {
        sendGroupInviteEmail({
          toEmail: userToAdd.email,
          inviterName,
          inviterEmail,
          groupName: updatedGroup.name,
          groupDescription: updatedGroup.description,
          groupId: updatedGroup._id
        }).catch(e => console.warn('Email invite dispatch error:', e.message));
      }

      if (!alreadyMember) {
        Notification.create({
          recipient: userToAdd._id,
          type: 'group:invite',
          message: `${inviterName} invited you to join the expense group "${updatedGroup.name}".`,
          groupId: updatedGroup._id
        }).catch(() => {});
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.id || req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isCreator = group.createdBy.toString() === userId.toString();
    const isSelf = memberId.toString() === userId.toString();

    // Only group creator can remove others, or a member can leave the group themselves
    if (!isCreator && !isSelf) {
      return res.status(403).json({ error: 'Only the group creator can remove other members' });
    }

    // Group creator cannot be removed (group should be deleted instead)
    if (group.createdBy.toString() === memberId.toString()) {
      return res.status(400).json({ error: 'The group creator cannot be removed from the group' });
    }

    // Filter out the member
    group.members = group.members.filter(m => (m._id || m).toString() !== memberId.toString());
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    // Invalidate dashboard stats cache so dashboards update instantly
    cache.clear().catch(() => {});

    res.json({
      success: true,
      message: 'Member removed successfully',
      group: updatedGroup,
      ...updatedGroup.toObject()
    });
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

    // Invalidate dashboard stats cache so dashboards update instantly
    cache.clear().catch(() => {});

    res.json({ success: true, message: 'Group deleted successfully' });
  } catch (err) {
    next(err);
  }
};

