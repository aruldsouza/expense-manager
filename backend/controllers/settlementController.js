const mongoose = require('mongoose');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const User = require('../models/User');
const cache = require('../utils/cache');
const { calculateGroupNetBalances } = require('../services/netBalanceService');
const { optimizeGroupDebts } = require('../services/debtOptimizationService');

const computeNetBalances = async (groupId) => {
  try {
    const result = await calculateGroupNetBalances(groupId);
    return result.balances;
  } catch (err) {
    if (err.statusCode === 404) return null;
    throw err;
  }
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

/**
 * 5️⃣ & 6️⃣ GET /api/groups/:groupId/settlements/optimized
 * Returns the greedily optimized settlement transactions, member balance details,
 * and comprehensive optimization statistics.
 */
exports.getOptimizedSettlements = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    // 5.2 Validate groupId
    if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing Group ID'
      });
    }

    // 5.3 Verify authentication
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    const currentUserId = (req.user.id || req.user._id).toString();

    // 5.4 Verify group membership
    const group = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    const isMember = (group.createdBy && group.createdBy.toString() === currentUserId) ||
      (Array.isArray(group.members) && group.members.some(m => (m._id || m).toString() === currentUserId));

    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access settlements for this group'
      });
    }

    // 5.5 - 5.7 & 6.1 - 6.6 Calculate net balances, greedy debt minimization, and statistics
    const optimization = await optimizeGroupDebts(groupId);

    // 5.8 Return optimized settlement list
    // 5.9 Return member balance information
    // 6.5 Include optimization statistics
    return res.json({
      success: true,
      data: optimization.optimizedTransactions, // Array alias for frontend components
      optimizedTransactions: optimization.optimizedTransactions,
      totalTransactions: optimization.totalTransactions,
      balances: optimization.balances,
      creditors: optimization.creditors,
      debtors: optimization.debtors,
      totalCreditorAmount: optimization.totalCreditorAmount,
      totalDebtorAmount: optimization.totalDebtorAmount,
      isBalanced: optimization.isBalanced,
      stats: optimization.stats
    });
  } catch (err) {
    // 5.10 Add proper error handling
    if (err.statusCode === 404) {
      return res.status(404).json({ success: false, error: err.message });
    }
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
