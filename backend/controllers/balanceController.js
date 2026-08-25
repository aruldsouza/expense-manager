const Expense = require('../models/Expense');
const Group = require('../models/Group');
const Settlement = require('../models/Settlement');
const { convertAmount, getCurrencySymbol } = require('../utils/exchangeRate');
const cache = require('../utils/cache');

const BALANCE_TTL = 90; // seconds

// @desc    Get group balances (with optional currency conversion)
// @route   GET /api/groups/:groupId/balances?convertTo=EUR
// @access  Private
const getGroupBalances = async (req, res, next) => {
    try {
        const groupId = req.params.groupId;
        const userId = (req.user.id || req.user._id).toString();
        const convertTo = req.query.convertTo ? req.query.convertTo.toUpperCase() : null;

        // Skip cache when FX conversion is requested (rates change frequently)
        const useCache = !convertTo;
        const cacheKey = `balances:${groupId}`;

        if (useCache) {
            const cached = await cache.get(cacheKey);
            if (cached) {
                return res.json({ success: true, data: cached, fromCache: true });
            }
        }

        // Group.members is a flat array of ObjectId refs, not { user, role } subdocs
        const group = await Group.findById(groupId).populate('members', 'name email');
        if (!group) {
            res.status(404);
            throw new Error('Group not found');
        }

        // Check membership — members is populated array of User objects
        const isMember = group.members.some(m => (m._id || m).toString() === userId);
        if (!isMember) {
            res.status(403);
            throw new Error('Not authorized to access balances for this group');
        }

        const groupCurrency = group.currency || 'INR';
        const expenses = await Expense.find({ group: groupId });
        const settlements = await Settlement.find({ group: groupId });

        // Initialize balances keyed by user ID
        const balances = {};
        group.members.forEach(m => {
            const id = (m._id || m).toString();
            balances[id] = { user: m, balance: 0 };
        });

        // Calculate balances from expenses — paidBy is the correct field name
        expenses.forEach(expense => {
            const payerId = (expense.paidBy || '').toString();
            if (balances[payerId]) balances[payerId].balance += expense.amount;
            expense.splits.forEach(split => {
                const uid = (split.user || '').toString();
                if (balances[uid]) balances[uid].balance -= split.amount;
            });
        });

        // Calculate balances from settlements — fromUser/toUser are the correct field names
        settlements.forEach(settlement => {
            const fromId = (settlement.fromUser || '').toString();
            const toId = (settlement.toUser || '').toString();
            if (balances[fromId]) balances[fromId].balance += settlement.amount;
            if (balances[toId]) balances[toId].balance -= settlement.amount;
        });

        // Build response — optionally convert amounts
        const needsConversion = convertTo && convertTo !== groupCurrency;

        const balanceList = await Promise.all(
            Object.values(balances).map(async (item) => {
                const nativeBalance = parseFloat(item.balance.toFixed(2));
                let convertedBalance = null;

                if (needsConversion) {
                    try {
                        convertedBalance = parseFloat(
                            (await convertAmount(nativeBalance, groupCurrency, convertTo)).toFixed(2)
                        );
                    } catch {
                        convertedBalance = null;
                    }
                }

                return {
                    user: item.user,
                    balance: nativeBalance,
                    groupCurrency,
                    groupCurrencySymbol: getCurrencySymbol(groupCurrency),
                    ...(needsConversion && {
                        convertedBalance,
                        displayCurrency: convertTo,
                        displayCurrencySymbol: getCurrencySymbol(convertTo),
                    })
                };
            })
        );

        res.json({ success: true, data: balanceList });

        // Cache after response sent (only when no FX conversion)
        if (useCache) {
            cache.set(cacheKey, balanceList, BALANCE_TTL).catch(() => { });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = { getGroupBalances };

