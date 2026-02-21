const Expense = require('../models/Expense');
const Group = require('../models/Group');
const Settlement = require('../models/Settlement');
const { convertAmount, getCurrencySymbol } = require('../utils/exchangeRate');

// @desc    Get group balances (with optional currency conversion)
// @route   GET /api/groups/:groupId/balances?convertTo=EUR
// @access  Private
const getGroupBalances = async (req, res, next) => {
    try {
        const groupId = req.params.groupId;
        const convertTo = req.query.convertTo ? req.query.convertTo.toUpperCase() : null;

        const group = await Group.findById(groupId).populate('members', 'name email');
        if (!group) {
            res.status(404);
            throw new Error('Group not found');
        }

        if (!group.members.some(member => member._id.toString() === req.user._id.toString())) {
            res.status(403);
            throw new Error('Not authorized to access balances for this group');
        }

        const groupCurrency = group.currency || 'USD';
        const expenses = await Expense.find({ group: groupId });
        const settlements = await Settlement.find({ group: groupId });

        // Initialize balances
        const balances = {};
        group.members.forEach(member => {
            balances[member._id.toString()] = { user: member, balance: 0 };
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
    } catch (error) {
        next(error);
    }
};

module.exports = { getGroupBalances };

