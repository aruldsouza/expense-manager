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

    // ── Task 8.4: Validate & sanitize all AI-generated receipt metadata ───────
    let sanitizedReceiptMeta = null;
    if (receiptMeta && typeof receiptMeta === 'object') {
      const sanitizeNumber = (v) => {
        if (v === null || v === undefined || v === '') return null;
        const n = parseFloat(v);
        return isFinite(n) && n >= 0 ? parseFloat(n.toFixed(4)) : null;
      };

      const sanitizeString = (v, maxLen = 200) => {
        if (!v || typeof v !== 'string') return null;
        const trimmed = v.trim();
        return trimmed.length > 0 ? trimmed.substring(0, maxLen) : null;
      };

      const sanitizedLineItems = Array.isArray(receiptMeta.lineItems)
        ? receiptMeta.lineItems
            .filter(item => item && typeof item === 'object')
            .map(item => ({
              name: sanitizeString(item.name, 200) || 'Item',
              quantity: sanitizeNumber(item.quantity),
              unitPrice: sanitizeNumber(item.unitPrice),
              totalPrice: sanitizeNumber(item.totalPrice)
            }))
            .slice(0, 100) // Cap to max 100 line items for safety
        : [];

      let validScannedAt = new Date();
      if (receiptMeta.scannedAt) {
        const parsedDate = new Date(receiptMeta.scannedAt);
        if (!isNaN(parsedDate.getTime())) validScannedAt = parsedDate;
      }

      sanitizedReceiptMeta = {
        merchant:      sanitizeString(receiptMeta.merchant, 200),
        currency:      sanitizeString(receiptMeta.currency, 10)?.toUpperCase() || null,
        subtotal:      sanitizeNumber(receiptMeta.subtotal),
        tax:           sanitizeNumber(receiptMeta.tax),
        discount:      sanitizeNumber(receiptMeta.discount),
        serviceCharge: sanitizeNumber(receiptMeta.serviceCharge),
        lineItems:     sanitizedLineItems,
        scannedAt:     validScannedAt
      };
    }

    const expense = await Expense.create({
      group: groupId,
      title: title.trim().substring(0, 200),
      amount: numAmount,
      paidBy,
      splitType,
      splits: calculatedSplits,
      category: category || 'General',
      date: date || new Date(),
      // Task 7.2 & 8.4 — Persist strictly sanitized receipt metadata
      receiptMeta: sanitizedReceiptMeta
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
