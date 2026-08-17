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

        const group = await Group.findById(groupId).populate('members.user', 'name email');
        if (!group) {
            res.status(404);
            throw new Error('Group not found');
        }

        // members is [{ user: {_id, name, email}, role }]
        if (!group.members.some(m => m.user && m.user._id.toString() === req.user._id.toString())) {
            res.status(403);
            throw new Error('Not authorized to access balances for this group');
        }

        const groupCurrency = group.currency || 'INR';
        const expenses = await Expense.find({ group: groupId });
        const settlements = await Settlement.find({ group: groupId });

        // Initialize balances — each member entry is { user: {...}, role }
        const balances = {};
        group.members.forEach(m => {
            if (m.user) balances[m.user._id.toString()] = { user: m.user, balance: 0 };
        });

        // Calculate balances from expenses
        expenses.forEach(expense => {
            const payerId = expense.payer.toString();
            if (balances[payerId]) balances[payerId].balance += expense.amount;
            expense.splits.forEach(split => {
                const userId = split.user.toString();
                if (balances[userId]) balances[userId].balance -= split.amount;
            });
        });

        // Calculate balances from settlements
        settlements.forEach(settlement => {
            const payerId = settlement.payer.toString();
            const payeeId = settlement.payee.toString();
            if (balances[payerId]) balances[payerId].balance += settlement.amount;
            if (balances[payeeId]) balances[payeeId].balance -= settlement.amount;
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

