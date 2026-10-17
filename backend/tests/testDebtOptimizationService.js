const assert = require('assert');
const {
    minimizeDebts,
    optimizeDebtsFromData
} = require('../services/debtOptimizationService');
const {
    computeNetBalancesFromData
} = require('../services/netBalanceService');

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function runTest(name, fn) {
    try {
        fn();
        console.log(`  ${colors.green}✔ PASS:${colors.reset} ${name}`);
        return true;
    } catch (err) {
        console.error(`  ${colors.red}✖ FAIL:${colors.reset} ${name}\n     ${err.message}`);
        return false;
    }
}

/**
 * Helper to mathematically verify that after applying all optimized transactions,
 * every member's final balance evaluates to exactly 0.00 (within $0.01 precision).
 */
function verifyAllBalancesSettled(initialBalances, transactions) {
    const finalBalances = {};
    initialBalances.forEach(b => {
        finalBalances[b.user._id.toString()] = b.netBalance;
    });

    transactions.forEach(tx => {
        const fromId = tx.fromUser._id.toString();
        const toId = tx.toUser._id.toString();
        // fromUser pays tx.amount -> their net balance increases (less negative)
        finalBalances[fromId] = Math.round((finalBalances[fromId] + tx.amount) * 100) / 100;
        // toUser receives tx.amount -> their net balance decreases (less positive)
        finalBalances[toId] = Math.round((finalBalances[toId] - tx.amount) * 100) / 100;
    });

    for (const [userId, bal] of Object.entries(finalBalances)) {
        if (Math.abs(bal) > 0.01) {
            throw new Error(`Member ${userId} not fully settled! Remaining balance: ${bal}`);
        }
    }
    return true;
}

function main() {
    console.log(`\n${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}   TASK 4: DEBT OPTIMIZATION ALGORITHM VALIDATION SUITE     ${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}\n`);

    let passed = 0;
    let total = 0;
    const record = (res) => { total++; if (res) passed++; };

    // 4.1 Test two-member debt scenario
    record(runTest('4.1: Two-member debt scenario (Alice & Bob)', () => {
        const members = [
            { _id: 'u1', name: 'Alice' },
            { _id: 'u2', name: 'Bob' }
        ];
        const expenses = [
            {
                paidBy: 'u1',
                amount: 100,
                splits: [
                    { user: 'u1', amount: 50 },
                    { user: 'u2', amount: 50 }
                ]
            }
        ];

        const res = optimizeDebtsFromData(members, expenses, []);
        assert.strictEqual(res.optimizedTransactions.length, 1, 'Should require exactly 1 transaction');
        const tx = res.optimizedTransactions[0];
        assert.strictEqual(tx.fromUser._id, 'u2', 'Bob should be the debtor');
        assert.strictEqual(tx.toUser._id, 'u1', 'Alice should be the creditor');
        assert.strictEqual(tx.amount, 50, 'Bob owes Alice $50');
        verifyAllBalancesSettled(res.balances, res.optimizedTransactions);
    }));

    // 4.2 Test three-member circular debt scenario
    record(runTest('4.2: Three-member circular debt scenario (A -> B -> C -> A cancels out)', () => {
        const members = [
            { _id: 'u1', name: 'Alice' },
            { _id: 'u2', name: 'Bob' },
            { _id: 'u3', name: 'Charlie' }
        ];
        // Alice pays $30 for Bob
        // Bob pays $30 for Charlie
        // Charlie pays $30 for Alice
        const expenses = [
            {
                paidBy: 'u1',
                amount: 30,
                splits: [{ user: 'u2', amount: 30 }]
            },
            {
                paidBy: 'u2',
                amount: 30,
                splits: [{ user: 'u3', amount: 30 }]
            },
            {
                paidBy: 'u3',
                amount: 30,
                splits: [{ user: 'u1', amount: 30 }]
            }
        ];

        const res = optimizeDebtsFromData(members, expenses, []);
        // Without optimization: 3 pairwise debts (Bob owes Alice, Charlie owes Bob, Alice owes Charlie)
        // With optimization: Net balances are all 0, so 0 transactions!
        assert.strictEqual(res.stats.originalTransactionsCount, 3, 'Original pairwise transactions should be 3');
        assert.strictEqual(res.optimizedTransactions.length, 0, 'Circular debt simplifies to 0 transactions');
        assert.strictEqual(res.stats.transactionsSaved, 3, '3 transactions eliminated');
        assert.strictEqual(res.stats.reductionPercentage, 100, '100% reduction achieved');
        verifyAllBalancesSettled(res.balances, res.optimizedTransactions);
    }));

    // 4.3 Test multiple debtors and creditors (5 members)
    record(runTest('4.3: Multiple debtors and creditors (5 members)', () => {
        const members = [
            { _id: 'u1', name: 'Alice' },
            { _id: 'u2', name: 'Bob' },
            { _id: 'u3', name: 'Charlie' },
            { _id: 'u4', name: 'Dave' },
            { _id: 'u5', name: 'Eve' }
        ];
        // Alice and Bob pay for dinner ($200 total, 5-way equal split = $40 each)
        // Alice paid $120 (net balance: +80)
        // Bob paid $80 (net balance: +40)
        // Charlie, Dave, Eve paid $0 (net balance: -40 each)
        const expenses = [
            {
                paidBy: 'u1',
                amount: 120,
                splits: [
                    { user: 'u1', amount: 24 },
                    { user: 'u2', amount: 24 },
                    { user: 'u3', amount: 24 },
                    { user: 'u4', amount: 24 },
                    { user: 'u5', amount: 24 }
                ]
            },
            {
                paidBy: 'u2',
                amount: 80,
                splits: [
                    { user: 'u1', amount: 16 },
                    { user: 'u2', amount: 16 },
                    { user: 'u3', amount: 16 },
                    { user: 'u4', amount: 16 },
                    { user: 'u5', amount: 16 }
                ]
            }
        ];

        const res = optimizeDebtsFromData(members, expenses, []);
        // Total debtors = 3, total creditors = 2.
        // N members = 5. Max possible transactions <= 5 - 1 = 4.
        // Original pairwise transactions: 6 (Charlie->Alice, Charlie->Bob, Dave->Alice, Dave->Bob, Eve->Alice, Eve->Bob)
        assert(res.optimizedTransactions.length <= 4, 'Transactions should be at most N-1 (<=4)');
        assert(res.optimizedTransactions.length < res.stats.originalTransactionsCount, 'Optimized count should be fewer than pairwise count');
        verifyAllBalancesSettled(res.balances, res.optimizedTransactions);
    }));

    // 4.4 Test unequal debt amounts
    record(runTest('4.4: Unequal debt amounts', () => {
        const members = [
            { _id: 'u1', name: 'Alice' },
            { _id: 'u2', name: 'Bob' },
            { _id: 'u3', name: 'Charlie' }
        ];
        // Alice pays 100
        // Bob owes 70, Charlie owes 30
        const expenses = [
            {
                paidBy: 'u1',
                amount: 100,
                splits: [
                    { user: 'u1', amount: 0 },
                    { user: 'u2', amount: 70 },
                    { user: 'u3', amount: 30 }
                ]
            }
        ];

        const res = optimizeDebtsFromData(members, expenses, []);
        assert.strictEqual(res.optimizedTransactions.length, 2);
        // Largest debtor Bob ($70) pays Alice ($70), then Charlie ($30) pays Alice ($30)
        assert.strictEqual(res.optimizedTransactions[0].fromUser._id, 'u2');
        assert.strictEqual(res.optimizedTransactions[0].amount, 70);
        assert.strictEqual(res.optimizedTransactions[1].fromUser._id, 'u3');
        assert.strictEqual(res.optimizedTransactions[1].amount, 30);
        verifyAllBalancesSettled(res.balances, res.optimizedTransactions);
    }));

    // 4.5 Test partially settled expenses
    record(runTest('4.5: Partially settled expenses', () => {
        const members = [
            { _id: 'u1', name: 'Alice' },
            { _id: 'u2', name: 'Bob' }
        ];
        // Alice pays 100, Bob owes 50
        const expenses = [
            {
                paidBy: 'u1',
                amount: 100,
                splits: [
                    { user: 'u1', amount: 50 },
                    { user: 'u2', amount: 50 }
                ]
            }
        ];
        // Bob has already settled 20 to Alice
        const settlements = [
            {
                fromUser: 'u2',
                toUser: 'u1',
                amount: 20,
                status: 'completed'
            }
        ];

        const res = optimizeDebtsFromData(members, expenses, settlements);
        assert.strictEqual(res.optimizedTransactions.length, 1);
        assert.strictEqual(res.optimizedTransactions[0].amount, 30, 'Remaining debt must be $30 after $20 settlement');
        verifyAllBalancesSettled(res.balances, res.optimizedTransactions);
    }));

    // 4.6 Test members with zero balance
    record(runTest('4.6: Members with zero balance ignored and no self-settlements', () => {
        const members = [
            { _id: 'u1', name: 'Alice' },
            { _id: 'u2', name: 'Bob' },
            { _id: 'u3', name: 'Charlie' }, // Inactive/zero balance
            { _id: 'u4', name: 'Dave' }    // Pays exact own share
        ];
        const expenses = [
            // Alice pays 100, Bob owes 50, Alice share is 50
            {
                paidBy: 'u1',
                amount: 100,
                splits: [
                    { user: 'u1', amount: 50 },
                    { user: 'u2', amount: 50 }
                ]
            },
            // Dave pays 25 for own food (solo expense)
            {
                paidBy: 'u4',
                amount: 25,
                splits: [{ user: 'u4', amount: 25 }]
            }
        ];

        const res = optimizeDebtsFromData(members, expenses, []);
        // Charlie and Dave have 0 net balance
        assert.strictEqual(res.optimizedTransactions.length, 1);
        assert.strictEqual(res.optimizedTransactions[0].fromUser._id, 'u2');
        assert.strictEqual(res.optimizedTransactions[0].toUser._id, 'u1');
        assert.strictEqual(res.optimizedTransactions[0].amount, 50);

        // Ensure no transaction involves Charlie or Dave
        const participants = res.optimizedTransactions.flatMap(tx => [tx.fromUser._id, tx.toUser._id]);
        assert(!participants.includes('u3'), 'Zero balance member Charlie should not be in transactions');
        assert(!participants.includes('u4'), 'Zero balance member Dave should not be in transactions');
        verifyAllBalancesSettled(res.balances, res.optimizedTransactions);
    }));

    // 4.7 Test decimal currency amounts
    record(runTest('4.7: Decimal currency amounts (e.g. $100 / 3 = 33.34, 33.33, 33.33)', () => {
        const members = [
            { _id: 'u1', name: 'Alice' },
            { _id: 'u2', name: 'Bob' },
            { _id: 'u3', name: 'Charlie' }
        ];
        const expenses = [
            {
                paidBy: 'u1',
                amount: 100,
                splits: [
                    { user: 'u1', amount: 33.34 },
                    { user: 'u2', amount: 33.33 },
                    { user: 'u3', amount: 33.33 }
                ]
            }
        ];

        const res = optimizeDebtsFromData(members, expenses, []);
        assert.strictEqual(res.isBalanced, true);
        assert.strictEqual(res.optimizedTransactions.length, 2);
        // Total settled must equal exactly Alice's net balance 66.66
        const totalSettled = res.optimizedTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        assert.strictEqual(Math.round(totalSettled * 100) / 100, 66.66);
        verifyAllBalancesSettled(res.balances, res.optimizedTransactions);
    }));

    // 4.8 Verify all outstanding balances are settled correctly
    record(runTest('4.8: Complex multi-party settlement conservation verification', () => {
        const members = [
            { _id: 'u1', name: 'Alice' },
            { _id: 'u2', name: 'Bob' },
            { _id: 'u3', name: 'Charlie' },
            { _id: 'u4', name: 'Dave' },
            { _id: 'u5', name: 'Eve' }
        ];
        const expenses = [
            {
                paidBy: 'u1',
                amount: 150,
                splits: [
                    { user: 'u1', amount: 30 },
                    { user: 'u2', amount: 40 },
                    { user: 'u3', amount: 50 },
                    { user: 'u4', amount: 30 }
                ]
            },
            {
                paidBy: 'u3',
                amount: 90,
                splits: [
                    { user: 'u2', amount: 30 },
                    { user: 'u3', amount: 30 },
                    { user: 'u5', amount: 30 }
                ]
            },
            {
                paidBy: 'u5',
                amount: 45,
                splits: [
                    { user: 'u1', amount: 15 },
                    { user: 'u4', amount: 15 },
                    { user: 'u5', amount: 15 }
                ]
            }
        ];

        const res = optimizeDebtsFromData(members, expenses, []);
        assert.strictEqual(res.isBalanced, true);
        verifyAllBalancesSettled(res.balances, res.optimizedTransactions);
    }));

    // 4.9 Verify optimized transactions are strictly fewer than original pairwise debts
    record(runTest('4.9: Verify optimized transactions are strictly fewer than original debts', () => {
        // In a group where everyone buys something for everyone else (complete graph = N*(N-1) debts = 12 debts)
        const members = [
            { _id: 'u1', name: 'Alice' },
            { _id: 'u2', name: 'Bob' },
            { _id: 'u3', name: 'Charlie' },
            { _id: 'u4', name: 'Dave' }
        ];
        const expenses = [
            { paidBy: 'u1', amount: 40, splits: [{ user: 'u2', amount: 10 }, { user: 'u3', amount: 10 }, { user: 'u4', amount: 10 }, { user: 'u1', amount: 10 }] },
            { paidBy: 'u2', amount: 40, splits: [{ user: 'u1', amount: 10 }, { user: 'u3', amount: 10 }, { user: 'u4', amount: 10 }, { user: 'u2', amount: 10 }] },
            { paidBy: 'u3', amount: 80, splits: [{ user: 'u1', amount: 20 }, { user: 'u2', amount: 20 }, { user: 'u4', amount: 20 }, { user: 'u3', amount: 20 }] },
            { paidBy: 'u4', amount: 20, splits: [{ user: 'u1', amount: 5 }, { user: 'u2', amount: 5 }, { user: 'u3', amount: 5 }, { user: 'u4', amount: 5 }] }
        ];

        const res = optimizeDebtsFromData(members, expenses, []);
        assert(res.stats.originalTransactionsCount >= 6, 'Original pairwise transactions should be >= 6');
        assert(res.optimizedTransactions.length <= 3, 'Optimized transactions must be <= N-1 (3)');
        assert(res.stats.transactionsSaved > 0, 'Transactions must be saved');
        assert(res.stats.reductionPercentage > 0, 'Reduction percentage must be > 0');
        console.log(`     Original debts: ${res.stats.originalTransactionsCount} -> Optimized: ${res.optimizedTransactions.length} (${res.stats.reductionPercentage}% reduction)`);
        verifyAllBalancesSettled(res.balances, res.optimizedTransactions);
    }));

    // 3.7 & 3.8 Prevent zero/negative transactions and immutability verification
    record(runTest('3.7 & 3.8: Non-zero/negative validation & immutability guarantee', () => {
        const originalDebtors = [
            { user: { _id: 'u1', name: 'Alice' }, amount: 50 },
            { user: { _id: 'u2', name: 'Bob' }, amount: 0 } // Zero amount
        ];
        const originalCreditors = [
            { user: { _id: 'u3', name: 'Charlie' }, amount: 50 },
            { user: { _id: 'u4', name: 'Dave' }, amount: -10 } // Negative amount
        ];

        const snapshotDebtors = JSON.stringify(originalDebtors);
        const snapshotCreditors = JSON.stringify(originalCreditors);

        const txs = minimizeDebts(originalDebtors, originalCreditors);

        // 3.8 Immutability: original objects must NOT be mutated
        assert.strictEqual(JSON.stringify(originalDebtors), snapshotDebtors, 'Original debtors must not be mutated');
        assert.strictEqual(JSON.stringify(originalCreditors), snapshotCreditors, 'Original creditors must not be mutated');

        // 3.7 No zero or negative transactions
        assert.strictEqual(txs.length, 1);
        assert(txs[0].amount > 0, 'Transaction amount must be positive');
        assert.strictEqual(txs[0].fromUser._id, 'u1');
        assert.strictEqual(txs[0].toUser._id, 'u3');
        assert.strictEqual(txs[0].amount, 50);
    }));

    console.log(`\n${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}RESULT: ${passed}/${total} PASSED (${Math.round(passed / total * 100)}%)${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}\n`);

    if (passed < total) process.exit(1);
}

main();
