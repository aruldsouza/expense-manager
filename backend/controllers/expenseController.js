const Expense = require('../models/Expense');
const Group = require('../models/Group');

exports.addExpense = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const title = req.body.title || req.body.description;
    const amount = req.body.amount;
    const paidBy = req.body.paidBy || req.body.payer;
    const splitType = (req.body.splitType || 'equal').toLowerCase();
    const { splits, category, date, receiptMeta } = req.body;  // Task 7.2
    const userId = req.user.id || req.user._id;

    if (!title || !amount || parseFloat(amount) <= 0 || !paidBy) {
      return res.status(400).json({ error: 'Title, positive amount, and paidBy are required' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some(m => (m._id || m).toString() === userId.toString());
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
    }

    let calculatedSplits = [];
    const numAmount = parseFloat(amount);

    if (splitType === 'equal') {
      const participantIds = (splits && splits.length > 0)
        ? splits.map(s => (s.user._id || s.user).toString())
        : group.members.map(m => (m._id || m).toString());

      const perPerson = Math.round((numAmount / participantIds.length) * 100) / 100;
      let totalAssigned = 0;

      calculatedSplits = participantIds.map((uId, idx) => {
        let personShare = perPerson;
        if (idx === participantIds.length - 1) {
          personShare = Math.round((numAmount - totalAssigned) * 100) / 100;
        } else {
          totalAssigned += personShare;
        }
        return {
          user: uId,
          amount: personShare,
          percentage: Math.round((personShare / numAmount) * 10000) / 100
        };
      });
    } else if (splitType === 'unequal') {
      if (!Array.isArray(splits) || splits.length === 0) {
        return res.status(400).json({ error: 'Splits array is required for unequal split' });
      }
      const sum = splits.reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0);
      if (Math.abs(sum - numAmount) > 0.05) {
        return res.status(400).json({ error: `Sum of splits (₹${sum.toFixed(2)}) does not match total expense amount (₹${numAmount.toFixed(2)})` });
      }
      calculatedSplits = splits.map(s => ({
        user: s.user._id || s.user,
        amount: parseFloat(s.amount),
        percentage: Math.round(((parseFloat(s.amount) || 0) / numAmount) * 10000) / 100
      }));
    } else if (splitType === 'percentage') {
      if (!Array.isArray(splits) || splits.length === 0) {
        return res.status(400).json({ error: 'Splits array is required for percentage split' });
      }
      const totalPct = splits.reduce((acc, s) => acc + (parseFloat(s.percentage) || 0), 0);
      if (Math.abs(totalPct - 100) > 0.1) {
        return res.status(400).json({ error: `Total percentage (${totalPct}%) must equal 100%` });
      }

      let totalAssigned = 0;
      calculatedSplits = splits.map((s, idx) => {
        const pct = parseFloat(s.percentage) || 0;
        let personShare = Math.round((numAmount * (pct / 100)) * 100) / 100;
        if (idx === splits.length - 1) {
          personShare = Math.round((numAmount - totalAssigned) * 100) / 100;
        } else {
          totalAssigned += personShare;
        }
        return {
          user: s.user._id || s.user,
          amount: personShare,
          percentage: pct
        };
      });
    } else {
      return res.status(400).json({ error: 'Invalid splitType. Allowed: equal, unequal, percentage' });
    }

    const expense = await Expense.create({
      group: groupId,
      title,
      amount: numAmount,
      paidBy,
      splitType,
      splits: calculatedSplits,
      category: category || 'General',
      date: date || new Date(),
      // Task 7.2 — Persist receipt metadata if provided; null otherwise
      receiptMeta: receiptMeta
        ? {
            merchant:      receiptMeta.merchant      || null,
            currency:      receiptMeta.currency      || null,
            subtotal:      receiptMeta.subtotal      != null ? parseFloat(receiptMeta.subtotal)      : null,
            tax:           receiptMeta.tax           != null ? parseFloat(receiptMeta.tax)           : null,
            discount:      receiptMeta.discount      != null ? parseFloat(receiptMeta.discount)      : null,
            serviceCharge: receiptMeta.serviceCharge != null ? parseFloat(receiptMeta.serviceCharge) : null,
            lineItems:     Array.isArray(receiptMeta.lineItems) ? receiptMeta.lineItems : [],
            scannedAt:     receiptMeta.scannedAt ? new Date(receiptMeta.scannedAt) : new Date()
          }
        : null
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email');

    res.status(201).json(populatedExpense);
  } catch (err) {
    next(err);
  }
};

exports.getExpenses = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id || req.user._id;
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some(m => (m._id || m).toString() === userId.toString());
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
    }

    const expenses = await Expense.find({ group: groupId })
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email')
      .sort({ date: -1 });

    res.json(expenses);
  } catch (err) {
    next(err);
  }
};
