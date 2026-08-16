const express = require('express');
const router = express.Router({ mergeParams: true });
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const expenses = await Expense.find({ group: groupId })
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email')
      .lean();

    const settlements = await Settlement.find({ group: groupId })
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email')
      .lean();

    const formattedExpenses = expenses.map(e => ({
      ...e,
      type: 'expense'
    }));

    const formattedSettlements = settlements.map(s => ({
      ...s,
      type: 'settlement'
    }));

    const allTransactions = [...formattedExpenses, ...formattedSettlements]
      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    res.json(allTransactions);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
