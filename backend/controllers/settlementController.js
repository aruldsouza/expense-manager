const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const User = require('../models/User');

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

  // Calculate from Expenses
  expenses.forEach(exp => {
    const payerId = exp.paidBy.toString();
    if (balances[payerId]) {
      balances[payerId].totalPaid += exp.amount;
      balances[payerId].netBalance += exp.amount;
    }

    exp.splits.forEach(split => {
      const uId = split.user.toString();
      if (balances[uId]) {
        balances[uId].totalOwed += split.amount;
        balances[uId].netBalance -= split.amount;
      }
    });
  });

  // Adjust for Settlements
  settlements.forEach(settle => {
    const fromId = settle.fromUser.toString();
    const toId = settle.toUser.toString();

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
    const { fromUser, toUser, amount, notes } = req.body;

    if (!fromUser || !toUser || !amount || amount <= 0) {
      return res.status(400).json({ error: 'fromUser, toUser, and positive amount are required' });
    }

    if (fromUser === toUser) {
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
      amount: parseFloat(amount),
      notes: notes || '',
      date: new Date()
    });

    const populated = await Settlement.findById(settlement._id)
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email');

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};
