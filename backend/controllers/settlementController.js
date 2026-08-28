const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const User = require('../models/User');
const cache = require('../utils/cache');

const computeNetBalances = async (groupId) => {
  const group = await Group.findById(groupId).populate('members', 'name email');
  if (!group) return null;

  const expenses = await Expense.find({ group: groupId });
  const settlements = await Settlement.find({ group: groupId });

  const balances = {};
  group.members.forEach(member => {
    balances[member._id.toString()] = {
      user: member,
      netBalance: 0,
      totalPaid: 0,
      totalOwed: 0
    };
  });

  const getUid = (u) => {
    if (!u) return '';
    if (typeof u === 'string') return u;
    if (u._id) return u._id.toString();
    if (u.id) return u.id.toString();
    return u.toString();
  };

  // Calculate from Expenses
  expenses.forEach(exp => {
    const payerId = getUid(exp.paidBy || exp.payer);
    if (balances[payerId]) {
      balances[payerId].totalPaid += exp.amount;
      balances[payerId].netBalance += exp.amount;
    }

    if (Array.isArray(exp.splits)) {
      exp.splits.forEach(split => {
        const uId = getUid(split.user);
        if (balances[uId]) {
          balances[uId].totalOwed += split.amount;
          balances[uId].netBalance -= split.amount;
        }
      });
    }
  });

  // Adjust for Settlements
  settlements.forEach(settle => {
    const fromId = getUid(settle.fromUser || settle.payer);
    const toId = getUid(settle.toUser || settle.payee);

    if (balances[fromId]) {
      balances[fromId].netBalance += settle.amount;
    }
    if (balances[toId]) {
      balances[toId].netBalance -= settle.amount;
    }
  });

  // Format balances rounded to 2 decimal places
  return Object.values(balances).map(b => ({
    user: b.user,
    balance: Math.round(b.netBalance * 100) / 100,
    netBalance: Math.round(b.netBalance * 100) / 100,
    totalPaid: Math.round(b.totalPaid * 100) / 100,
    totalOwed: Math.round(b.totalOwed * 100) / 100
  }));
};

exports.getGroupBalances = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const balances = await computeNetBalances(groupId);
    if (!balances) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json(balances);
  } catch (err) {
    next(err);
  }
};

exports.getOptimizedSettlements = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const balances = await computeNetBalances(groupId);
    if (!balances) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Debtors have negative net balance, Creditors have positive net balance
    const debtors = [];
    const creditors = [];

    balances.forEach(b => {
      if (b.netBalance < -0.01) {
        debtors.push({ user: b.user, amount: Math.abs(b.netBalance) });
      } else if (b.netBalance > 0.01) {
        creditors.push({ user: b.user, amount: b.netBalance });
      }
    });

    // Greedy Debt Simplification
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const optimized = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      const settleAmount = Math.min(debtor.amount, creditor.amount);
      const roundedAmount = Math.round(settleAmount * 100) / 100;

      if (roundedAmount > 0) {
        optimized.push({
          fromUser: debtor.user,
          toUser: creditor.user,
          from: debtor.user,
          to: creditor.user,
          amount: roundedAmount
        });
      }

      debtor.amount -= roundedAmount;
      creditor.amount -= roundedAmount;

      if (debtor.amount <= 0.01) i++;
      if (creditor.amount <= 0.01) j++;
    }

    res.json({
      optimizedTransactions: optimized,
      totalTransactions: optimized.length
    });
  } catch (err) {
    next(err);
  }
};

exports.recordSettlement = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id || req.user._id;
    const fromUser = req.body.fromUser || req.body.payer || userId;
    const toUser = req.body.toUser || req.body.payee;
    const amount = parseFloat(req.body.amount);
    const notes = req.body.notes || req.body.note || '';

    if (!fromUser || !toUser || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'fromUser (or payer), toUser (or payee), and positive amount are required' });
    }

    if (fromUser.toString() === toUser.toString()) {
      return res.status(400).json({ error: 'Cannot record settlement to self' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const settlement = await Settlement.create({
      group: groupId,
      fromUser,
      toUser,
      amount,
      notes,
      date: new Date()
    });

    const populated = await Settlement.findById(settlement._id)
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email');

    // Invalidate dashboard stats cache so dashboards update instantly
    cache.clear().catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Settlement recorded successfully',
      data: populated,
      meta: {
        settlement: populated,
        wasPartial: false,
        remainingDebt: 0
      },
      ...populated.toObject()
    });
  } catch (err) {
    next(err);
  }
};
