const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');

/**
 * Helper to safely extract a string ID from any user representation
 * (ObjectId, string, populated user object with _id or id)
 */
function getUserId(userRef) {
    if (!userRef) return '';
    if (typeof userRef === 'string') return userRef.trim();
    if (userRef._id) return userRef._id.toString();
    if (userRef.id) return userRef.id.toString();
    return userRef.toString().trim();
}

/**
 * Pure calculation function: computes net balances given members, expenses, and settlements arrays.
 * Can be used with database query results or in-memory test data.
 *
 * @param {Array} members - List of group members (User documents or Objects with _id, name, email)
 * @param {Array} expenses - List of group expenses
 * @param {Array} settlements - List of completed settlements
 * @returns {Object} { balances, creditors, debtors, totalCreditorAmount, totalDebtorAmount, isBalanced }
 */
function computeNetBalancesFromData(members = [], expenses = [], settlements = []) {
    const balancesMap = {};

    // 1. Initialize balance records for all members
    members.forEach(member => {
        const uid = getUserId(member);
        if (!uid) return;

        balancesMap[uid] = {
            user: {
                _id: uid,
                name: member.name || 'Member',
                email: member.email || ''
            },
            totalPaid: 0,
            totalOwed: 0,
            settlementsPaid: 0,
            settlementsReceived: 0,
            netBalance: 0,
            status: 'settled'
        };
    });

    // 2. Calculate from Expenses (2.2 & 2.3)
    expenses.forEach(exp => {
        const payerId = getUserId(exp.paidBy || exp.payer);
        const expAmount = parseFloat(exp.amount) || 0;

        if (payerId) {
            if (!balancesMap[payerId]) {
                const pObj = exp.paidBy || exp.payer;
                balancesMap[payerId] = {
                    user: { _id: payerId, name: pObj?.name || 'Member', email: pObj?.email || '' },
                    totalPaid: 0, totalOwed: 0, settlementsPaid: 0, settlementsReceived: 0, netBalance: 0, status: 'settled'
                };
            }
            balancesMap[payerId].totalPaid += expAmount;
        }

        if (Array.isArray(exp.splits)) {
            exp.splits.forEach(split => {
                const splitUid = getUserId(split.user);
                const splitAmount = parseFloat(split.amount) || 0;

                if (splitUid) {
                    if (!balancesMap[splitUid]) {
                        const sObj = split.user;
                        balancesMap[splitUid] = {
                            user: { _id: splitUid, name: sObj?.name || 'Member', email: sObj?.email || '' },
                            totalPaid: 0, totalOwed: 0, settlementsPaid: 0, settlementsReceived: 0, netBalance: 0, status: 'settled'
                        };
                    }
                    balancesMap[splitUid].totalOwed += splitAmount;
                }
            });
        }
    });

    // 3. Account for existing completed Settlements (2.7)
    settlements.forEach(settlement => {
        const fromId = getUserId(settlement.fromUser || settlement.payer);
        const toId = getUserId(settlement.toUser || settlement.payee);
        const settleAmount = parseFloat(settlement.amount) || 0;

        if (fromId && balancesMap[fromId]) {
            balancesMap[fromId].settlementsPaid += settleAmount;
        }
        if (toId && balancesMap[toId]) {
            balancesMap[toId].settlementsReceived += settleAmount;
        }
    });

    // 4. Calculate Final Net Balance for each member (2.4)
    // Formula: netBalance = (totalPaid - totalOwed) + (settlementsPaid - settlementsReceived)
    const balances = Object.values(balancesMap).map(b => {
        const rawNet = (b.totalPaid - b.totalOwed) + (b.settlementsPaid - b.settlementsReceived);
        const roundedNet = Math.round(rawNet * 100) / 100;

        let status = 'settled';
        if (roundedNet > 0.009) status = 'creditor';
        else if (roundedNet < -0.009) status = 'debtor';

        return {
            user: b.user,
            totalPaid: Math.round(b.totalPaid * 100) / 100,
            totalOwed: Math.round(b.totalOwed * 100) / 100,
            settlementsPaid: Math.round(b.settlementsPaid * 100) / 100,
            settlementsReceived: Math.round(b.settlementsReceived * 100) / 100,
            netBalance: roundedNet,
            balance: roundedNet, // Backward compatibility alias
            status
        };
    });

    // 5. Identify Creditors and Debtors (2.5) & Ignore Zero-Balance Members (2.6)
    const creditors = [];
    const debtors = [];

    balances.forEach(b => {
        if (b.status === 'creditor') {
            creditors.push({
                user: b.user,
                amount: Math.round(b.netBalance * 100) / 100
            });
        } else if (b.status === 'debtor') {
            debtors.push({
                user: b.user,
                amount: Math.round(Math.abs(b.netBalance) * 100) / 100
            });
        }
        // Members with Math.abs(b.netBalance) <= 0.009 remain 'settled' and are excluded from creditors/debtors
    });

    // 6. Ensure total creditor amount equals total debtor amount (2.8)
    const totalCreditorAmount = Math.round(creditors.reduce((sum, c) => sum + c.amount, 0) * 100) / 100;
    const totalDebtorAmount = Math.round(debtors.reduce((sum, d) => sum + d.amount, 0) * 100) / 100;
    const diff = Math.round((totalCreditorAmount - totalDebtorAmount) * 100) / 100;

    // Harmonize micro-cent rounding difference (if any 1-cent split rounding exists)
    if (Math.abs(diff) === 0.01 && debtors.length > 0 && creditors.length > 0) {
        if (diff > 0) {
            // Creditors sum is 0.01 higher than debtors -> adjust largest debtor
            debtors.sort((a, b) => b.amount - a.amount);
            debtors[0].amount = Math.round((debtors[0].amount + 0.01) * 100) / 100;
        } else {
            // Debtors sum is 0.01 higher than creditors -> adjust largest creditor
            creditors.sort((a, b) => b.amount - a.amount);
            creditors[0].amount = Math.round((creditors[0].amount + 0.01) * 100) / 100;
        }
    }

    const finalTotalCreditor = Math.round(creditors.reduce((sum, c) => sum + c.amount, 0) * 100) / 100;
    const finalTotalDebtor = Math.round(debtors.reduce((sum, d) => sum + d.amount, 0) * 100) / 100;
    const isBalanced = Math.abs(finalTotalCreditor - finalTotalDebtor) < 0.01;

    return {
        balances,
        creditors,
        debtors,
        totalCreditorAmount: finalTotalCreditor,
        totalDebtorAmount: finalTotalDebtor,
        isBalanced
    };
}

/**
 * Service function: fetches group data from MongoDB and calculates complete net balances
 *
 * @param {string} groupId - MongoDB Group ID
 * @returns {Promise<Object>} Net balance calculation result
 */
async function calculateGroupNetBalances(groupId) {
    const group = await Group.findById(groupId).populate('members', 'name email');
    if (!group) {
        const error = new Error('Group not found');
        error.statusCode = 404;
        throw error;
    }

    // Include createdBy in members list if not already present
    const membersList = [...(group.members || [])];
    if (group.createdBy) {
        const creatorId = getUserId(group.createdBy);
        const exists = membersList.some(m => getUserId(m) === creatorId);
        if (!exists) {
            membersList.push({ _id: creatorId, name: 'Admin', email: '' });
        }
    }

    const [expenses, settlements] = await Promise.all([
        Expense.find({ group: groupId }).populate('paidBy', 'name email').populate('splits.user', 'name email'),
        Settlement.find({ group: groupId }).populate('fromUser', 'name email').populate('toUser', 'name email')
    ]);

    const result = computeNetBalancesFromData(membersList, expenses, settlements);

    return {
        groupId: group._id.toString(),
        groupName: group.name,
        groupCurrency: group.currency || 'INR',
        expenses,
        settlements,
        ...result
    };
}

module.exports = {
    getUserId,
    computeNetBalancesFromData,
    calculateGroupNetBalances
};
