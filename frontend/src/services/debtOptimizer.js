/**
 * Client-Side Greedy Min-Cash-Flow Debt Simplification Algorithm
 * Minimizes total number of transactions required to settle all debts in a group.
 */
export function calculateNetBalances(members, expenses = [], settlements = []) {
  const balancesMap = {};

  members.forEach(m => {
    const mId = m._id || m.id;
    balancesMap[mId] = {
      user: m,
      netBalance: 0,
      totalPaid: 0,
      totalOwed: 0
    };
  });

  // Process Expenses
  expenses.forEach(exp => {
    const payerId = typeof exp.paidBy === 'object' ? (exp.paidBy._id || exp.paidBy.id) : exp.paidBy;
    if (balancesMap[payerId]) {
      balancesMap[payerId].totalPaid += exp.amount;
      balancesMap[payerId].netBalance += exp.amount;
    }

    if (Array.isArray(exp.splits)) {
      exp.splits.forEach(s => {
        const uId = typeof s.user === 'object' ? (s.user._id || s.user.id) : s.user;
        if (balancesMap[uId]) {
          balancesMap[uId].totalOwed += s.amount;
          balancesMap[uId].netBalance -= s.amount;
        }
      });
    }
  });

  // Process Settlements
  settlements.forEach(s => {
    const fromId = typeof s.fromUser === 'object' ? (s.fromUser._id || s.fromUser.id) : s.fromUser;
    const toId = typeof s.toUser === 'object' ? (s.toUser._id || s.toUser.id) : s.toUser;

    if (balancesMap[fromId]) {
      balancesMap[fromId].netBalance += s.amount;
    }
    if (balancesMap[toId]) {
      balancesMap[toId].netBalance -= s.amount;
    }
  });

  return Object.values(balancesMap).map(b => ({
    user: b.user,
    netBalance: Math.round(b.netBalance * 100) / 100,
    totalPaid: Math.round(b.totalPaid * 100) / 100,
    totalOwed: Math.round(b.totalOwed * 100) / 100
  }));
}

export function computeOptimizedSettlements(balances) {
  const debtors = [];
  const creditors = [];

  balances.forEach(b => {
    if (b.netBalance < -0.01) {
      debtors.push({ user: b.user, amount: Math.abs(b.netBalance) });
    } else if (b.netBalance > 0.01) {
      creditors.push({ user: b.user, amount: b.netBalance });
    }
  });

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

  return optimized;
}
