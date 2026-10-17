const {
    computeNetBalancesFromData,
    calculateGroupNetBalances
} = require('./netBalanceService');

/**
 * Pure function: Implements the Greedy Min-Cash-Flow Debt Simplification Algorithm.
 * Matches the largest debtor with the largest creditor iteratively until all balances are settled.
 *
 * Guaranteed Properties:
 * 1. Minimizes the total number of cross-member settlement transactions.
 * 2. Never generates zero or negative transactions.
 * 3. Never modifies the original balance, expense, or settlement objects (pure immutable inputs).
 * 4. Completely clears all outstanding debtor and creditor balances.
 *
 * @param {Array} debtors - Array of { user, amount }
 * @param {Array} creditors - Array of { user, amount }
 * @returns {Array} Array of optimized transactions { fromUser, toUser, from, to, amount }
 */
function minimizeDebts(debtors = [], creditors = []) {
    // 3.8 Ensure immutability by deep cloning debtor and creditor arrays
    let debtorsList = debtors
        .filter(d => d && d.amount > 0.009)
        .map(d => ({
            user: (d.user && typeof d.user === 'object') ? { ...d.user } : { _id: d.user },
            amount: Math.round(d.amount * 100) / 100
        }));

    let creditorsList = creditors
        .filter(c => c && c.amount > 0.009)
        .map(c => ({
            user: (c.user && typeof c.user === 'object') ? { ...c.user } : { _id: c.user },
            amount: Math.round(c.amount * 100) / 100
        }));

    const optimizedTransactions = [];

    // 3.6 Continue until all debts are settled
    while (debtorsList.length > 0 && creditorsList.length > 0) {
        // 3.2 Sort debtors and creditors descending by outstanding balance
        debtorsList.sort((a, b) => b.amount - a.amount);
        creditorsList.sort((a, b) => b.amount - a.amount);

        // 3.3 Match the largest debtor with the largest creditor
        const debtor = debtorsList[0];
        const creditor = creditorsList[0];

        // 3.4 Calculate the minimum amount required for each transaction
        const settleAmount = Math.round(Math.min(debtor.amount, creditor.amount) * 100) / 100;

        const debtorId = debtor.user?._id ? debtor.user._id.toString() : '';
        const creditorId = creditor.user?._id ? creditor.user._id.toString() : '';

        // 3.7 Prevent zero/negative transactions and self-settlements
        if (settleAmount > 0.009 && debtorId !== creditorId) {
            optimizedTransactions.push({
                fromUser: debtor.user,
                toUser: creditor.user,
                from: debtor.user,      // Alias for frontend compatibility
                to: creditor.user,        // Alias for frontend compatibility
                amount: settleAmount
            });

            // 3.5 Update remaining debtor and creditor balances
            debtor.amount = Math.round((debtor.amount - settleAmount) * 100) / 100;
            creditor.amount = Math.round((creditor.amount - settleAmount) * 100) / 100;
        } else {
            // Safety break if matching non-viable or self-debt to avoid infinite loop
            debtor.amount = 0;
            creditor.amount = 0;
        }

        // Remove fully settled debtors and creditors (< $0.01)
        debtorsList = debtorsList.filter(d => d.amount > 0.009);
        creditorsList = creditorsList.filter(c => c.amount > 0.009);
    }

    return optimizedTransactions;
}

/**
 * Calculates net balances and optimizes debts for in-memory data (useful for simulation & testing)
 *
 * @param {Array} members
 * @param {Array} expenses
 * @param {Array} settlements
 * @returns {Object} { balances, creditors, debtors, optimizedTransactions, originalPairwiseCount, stats }
 */
function optimizeDebtsFromData(members = [], expenses = [], settlements = []) {
    // 1. Calculate net balances
    const balanceResult = computeNetBalancesFromData(members, expenses, settlements);

    // 2. Count original non-optimized pairwise debts for comparison
    const pairwiseDebtMap = {};
    expenses.forEach(exp => {
        const payerId = exp.paidBy?._id || exp.paidBy || exp.payer?._id || exp.payer;
        if (!payerId) return;

        (exp.splits || []).forEach(split => {
            const splitUid = split.user?._id || split.user;
            if (splitUid && splitUid.toString() !== payerId.toString()) {
                const key = `${splitUid.toString()}->${payerId.toString()}`;
                pairwiseDebtMap[key] = (pairwiseDebtMap[key] || 0) + (split.amount || 0);
            }
        });
    });
    const originalPairwiseCount = Object.keys(pairwiseDebtMap).length;

    // 3. Run greedy debt minimization
    const optimizedTransactions = minimizeDebts(balanceResult.debtors, balanceResult.creditors);
    const optimizedCount = optimizedTransactions.length;
    const transactionsSaved = Math.max(0, originalPairwiseCount - optimizedCount);
    const reductionPercentage = originalPairwiseCount > 0
        ? Math.round((transactionsSaved / originalPairwiseCount) * 100)
        : 0;

    return {
        balances: balanceResult.balances,
        creditors: balanceResult.creditors,
        debtors: balanceResult.debtors,
        totalCreditorAmount: balanceResult.totalCreditorAmount,
        totalDebtorAmount: balanceResult.totalDebtorAmount,
        isBalanced: balanceResult.isBalanced,
        optimizedTransactions,
        stats: {
            originalTransactionsCount: originalPairwiseCount,
            optimizedTransactionsCount: optimizedCount,
            transactionsSaved,
            reductionPercentage
        }
    };
}

/**
 * Service function: fetches group data from MongoDB, calculates net balances,
 * and runs greedy debt optimization.
 *
 * @param {string} groupId - MongoDB Group ID
 * @returns {Promise<Object>} Full optimization result with balances, transactions, and stats
 */
async function optimizeGroupDebts(groupId) {
    const balanceResult = await calculateGroupNetBalances(groupId);

    // 6.1 Calculate original pairwise transaction count
    const pairwiseDebtMap = {};
    (balanceResult.expenses || []).forEach(exp => {
        const payerId = (exp.paidBy?._id || exp.paidBy || exp.payer?._id || exp.payer || '').toString();
        if (!payerId) return;

        (exp.splits || []).forEach(split => {
            const splitUid = (split.user?._id || split.user || '').toString();
            if (splitUid && splitUid !== payerId && (split.amount || 0) > 0.009) {
                const key = `${splitUid}->${payerId}`;
                pairwiseDebtMap[key] = (pairwiseDebtMap[key] || 0) + split.amount;
            }
        });
    });

    const originalTransactionsCount = Object.keys(pairwiseDebtMap).length;

    // Run greedy debt minimization
    const optimizedTransactions = minimizeDebts(balanceResult.debtors, balanceResult.creditors);
    const optimizedTransactionsCount = optimizedTransactions.length;
    const transactionsSaved = Math.max(0, originalTransactionsCount - optimizedTransactionsCount);
    const reductionPercentage = originalTransactionsCount > 0
        ? Math.round((transactionsSaved / originalTransactionsCount) * 100)
        : 0;

    return {
        groupId: balanceResult.groupId,
        groupName: balanceResult.groupName,
        groupCurrency: balanceResult.groupCurrency,
        balances: balanceResult.balances,
        creditors: balanceResult.creditors,
        debtors: balanceResult.debtors,
        totalCreditorAmount: balanceResult.totalCreditorAmount,
        totalDebtorAmount: balanceResult.totalDebtorAmount,
        isBalanced: balanceResult.isBalanced,
        optimizedTransactions,
        totalTransactions: optimizedTransactionsCount,
        stats: {
            originalTransactionsCount,
            optimizedTransactionsCount,
            transactionsSaved,
            reductionPercentage
        }
    };
}

module.exports = {
    minimizeDebts,
    optimizeDebtsFromData,
    optimizeGroupDebts
};
