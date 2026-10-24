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

/**
 * GET /api/groups/:groupId/settlements/debt?payer=...&payee=...
 * Returns the current outstanding net balance/debt of the payer.
 */
exports.getDebtBetweenMembers = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { payer, payee } = req.query;

    if (!payer) {
      return res.status(400).json({ success: false, error: 'Payer ID is required' });
    }

    const netResult = await calculateGroupNetBalances(groupId);
    const balances = netResult.balances || [];
    const payerBal = balances.find(b => b.user._id.toString() === payer.toString());
    const outstanding = payerBal && payerBal.netBalance < -0.009 ? Math.abs(payerBal.netBalance) : 0;

    return res.json({
      success: true,
      data: {
        payer,
        payee,
        outstanding: Math.round(outstanding * 100) / 100
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 11.3 - 11.5 POST /api/groups/:groupId/settlements
 * Records a settlement payment between members.
 * Validates membership, amount against outstanding debtor balance, and prevents duplicates.
 */
exports.recordSettlement = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id || req.user._id;
    const fromUser = req.body.fromUser || req.body.payer || userId;
    const toUser = req.body.toUser || req.body.payee;
    const amount = parseFloat(req.body.amount);
    const notes = req.body.notes || req.body.note || '';

    // 11.5 Validate required fields & positive amount
    if (!fromUser || !toUser || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Payer (fromUser), payee (toUser), and a valid positive amount are required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(fromUser) || !mongoose.Types.ObjectId.isValid(toUser)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid member ID format'
      });
    }

    if (fromUser.toString() === toUser.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot record settlement to self'
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    // Verify both payer and payee are members of this group
    const isMember = (uId) => {
      const str = uId.toString();
      return (group.createdBy && group.createdBy.toString() === str) ||
        (Array.isArray(group.members) && group.members.some(m => (m._id || m).toString() === str));
    };

    if (!isMember(fromUser) || !isMember(toUser)) {
      return res.status(400).json({
        success: false,
        error: 'Both payer and recipient must be members of the group'
      });
    }

    // 11.4 Prevent duplicate settlement records (identical settlement within 15 seconds)
    const fifteenSecondsAgo = new Date(Date.now() - 15000);
    const recentDuplicate = await Settlement.findOne({
      group: groupId,
      fromUser,
      toUser,
      amount,
      createdAt: { $gte: fifteenSecondsAgo }
    });

    if (recentDuplicate) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate settlement detected. This payment was already recorded seconds ago.'
      });
    }

    // 11.5 Validate settlement amount against debtor's outstanding net balance
    const netResult = await calculateGroupNetBalances(groupId);
    const balances = netResult.balances || [];
    const payerBal = balances.find(b => b.user._id.toString() === fromUser.toString());

    if (!payerBal || payerBal.netBalance >= -0.009) {
      return res.status(400).json({
        success: false,
        error: 'Payer has no outstanding debt in this group'
      });
    }

    const maxOwed = Math.abs(payerBal.netBalance);
    if (amount > maxOwed + 0.01) {
      return res.status(400).json({
        success: false,
        error: `Settlement amount (${amount}) exceeds debtor's outstanding debt of ${maxOwed.toFixed(2)}`
      });
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

    // Calculate remaining debt & partial status
    const remainingDebt = Math.max(0, Math.round((maxOwed - amount) * 100) / 100);
    const wasPartial = remainingDebt > 0.009;

    // Invalidate dashboard stats cache so dashboards update instantly
    cache.clear().catch(() => {});

    // Real-time broadcast if socket.io is available
    try {
      const { getIO } = require('../socket');
      const io = getIO();
      if (io) {
        io.to(`group:${groupId}`).emit('settlement:new', {
          settlement: populated,
          wasPartial,
          remainingDebt
        });
      }
    } catch (_) {
      // Socket may not be initialized in some test contexts
    }

    res.status(201).json({
      success: true,
      message: 'Settlement recorded successfully',
      data: populated,
      meta: {
        settlement: populated,
        wasPartial,
        remainingDebt
      },
      ...populated.toObject()
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/groups/:groupId/settlements
 * Returns list of completed settlements for a group.
 */
exports.getGroupSettlements = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const settlements = await Settlement.find({ group: groupId })
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email')
      .sort({ date: -1 });

    const mapped = settlements.map(s => {
      const obj = s.toObject();
      return {
        ...obj,
        payer: obj.fromUser,
        payee: obj.toUser
      };
    });

    res.json({
      success: true,
      data: mapped,
      settlements: mapped
    });
  } catch (err) {
    next(err);
  }
};


