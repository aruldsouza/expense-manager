const assert = require('assert');
const {
    computeNetBalancesFromData,
    calculateGroupNetBalances
} = require('../services/netBalanceService');

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
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

async function runAsyncTest(name, fn) {
    try {
        await fn();
        console.log(`  ${colors.green}✔ PASS:${colors.reset} ${name}`);
        return true;
    } catch (err) {
        console.error(`  ${colors.red}✖ FAIL:${colors.reset} ${name}\n     ${err.message}`);
        return false;
    }
}

async function main() {
    console.log(`\n${colors.bold}═════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}      TASK 2: NET BALANCE SERVICE VERIFICATION SUITE         ${colors.reset}`);
    console.log(`${colors.bold}═════════════════════════════════════════════════════════════${colors.reset}\n`);

    let passed = 0;
    let total = 0;

    const record = (res) => { total++; if (res) passed++; };

    // Test 1: Simple 2-member equal expense
    record(runTest('2.2 & 2.3 & 2.4: Simple 2-member equal expense net balance', () => {
        const members = [{ _id: 'u1', name: 'Alice' }, { _id: 'u2', name: 'Bob' }];
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
        const res = computeNetBalancesFromData(members, expenses, []);

        const alice = res.balances.find(b => b.user._id === 'u1');
        const bob = res.balances.find(b => b.user._id === 'u2');

        assert.strictEqual(alice.totalPaid, 100);
        assert.strictEqual(alice.totalOwed, 50);
        assert.strictEqual(alice.netBalance, 50);
        assert.strictEqual(alice.status, 'creditor');

        assert.strictEqual(bob.totalPaid, 0);
        assert.strictEqual(bob.totalOwed, 50);
        assert.strictEqual(bob.netBalance, -50);
        assert.strictEqual(bob.status, 'debtor');
    }));

    // Test 2: Identify Creditors and Debtors
    record(runTest('2.5: Correctly identify creditors and debtors', () => {
        const members = [
            { _id: 'u1', name: 'Alice' },
            { _id: 'u2', name: 'Bob' },
            { _id: 'u3', name: 'Charlie' }
        ];
        const expenses = [
            {
                paidBy: 'u1',
                amount: 90,
                splits: [
                    { user: 'u1', amount: 30 },
                    { user: 'u2', amount: 30 },
                    { user: 'u3', amount: 30 }
                ]
            }
        ];
        const res = computeNetBalancesFromData(members, expenses, []);

        assert.strictEqual(res.creditors.length, 1);
        assert.strictEqual(res.creditors[0].user._id, 'u1');
        assert.strictEqual(res.creditors[0].amount, 60);

        assert.strictEqual(res.debtors.length, 2);
        const debtorIds = res.debtors.map(d => d.user._id);
        assert.ok(debtorIds.includes('u2'));
        assert.ok(debtorIds.includes('u3'));
        assert.strictEqual(res.debtors[0].amount, 30);
        assert.strictEqual(res.debtors[1].amount, 30);
    }));

    // Test 3: Ignore members with zero balance
    record(runTest('2.6: Ignore members with zero balance from creditors & debtors', () => {
        const members = [
            { _id: 'u1', name: 'Alice' },
            { _id: 'u2', name: 'Bob' },
            { _id: 'u3', name: 'Charlie' }
        ];
        // Alice pays 60 for Alice and Bob only; Charlie has no expense/split
        const expenses = [
            {
                paidBy: 'u1',
                amount: 60,
                splits: [
                    { user: 'u1', amount: 30 },
                    { user: 'u2', amount: 30 }
                ]
            }
        ];
        const res = computeNetBalancesFromData(members, expenses, []);

        const charlie = res.balances.find(b => b.user._id === 'u3');
        assert.strictEqual(charlie.netBalance, 0);
        assert.strictEqual(charlie.status, 'settled');

        // Charlie must NOT be in creditors or debtors
        assert.ok(!res.creditors.some(c => c.user._id === 'u3'));
        assert.ok(!res.debtors.some(d => d.user._id === 'u3'));
    }));

    // Test 4: Account for existing completed settlements
    record(runTest('2.7: Account for existing completed settlements', () => {
        const members = [{ _id: 'u1', name: 'Alice' }, { _id: 'u2', name: 'Bob' }];
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
        // Bob settled 20 to Alice
        const settlements = [
            {
                fromUser: 'u2',
                toUser: 'u1',
                amount: 20
            }
        ];
        const res = computeNetBalancesFromData(members, expenses, settlements);

        const alice = res.balances.find(b => b.user._id === 'u1');
        const bob = res.balances.find(b => b.user._id === 'u2');

        // Alice net balance: 50 - 20 received = 30
        assert.strictEqual(alice.settlementsReceived, 20);
        assert.strictEqual(alice.netBalance, 30);

        // Bob net balance: -50 + 20 paid = -30
        assert.strictEqual(bob.settlementsPaid, 20);
        assert.strictEqual(bob.netBalance, -30);

        // Full settlement: Bob settles remaining 30 to Alice
        const fullSettlements = [
            { fromUser: 'u2', toUser: 'u1', amount: 20 },
            { fromUser: 'u2', toUser: 'u1', amount: 30 }
        ];
        const fullRes = computeNetBalancesFromData(members, expenses, fullSettlements);
        const aliceFull = fullRes.balances.find(b => b.user._id === 'u1');
        const bobFull = fullRes.balances.find(b => b.user._id === 'u2');

        assert.strictEqual(aliceFull.netBalance, 0);
        assert.strictEqual(aliceFull.status, 'settled');
        assert.strictEqual(bobFull.netBalance, 0);
        assert.strictEqual(bobFull.status, 'settled');
        assert.strictEqual(fullRes.creditors.length, 0);
        assert.strictEqual(fullRes.debtors.length, 0);
    }));

    // Test 5: Ensure total creditor amount equals total debtor amount
    record(runTest('2.8: Ensure total creditor amount equals total debtor amount (conservation)', () => {
        const members = [
            { _id: 'u1', name: 'Alice' },
            { _id: 'u2', name: 'Bob' },
            { _id: 'u3', name: 'Charlie' },
            { _id: 'u4', name: 'Dave' }
        ];
        // Complex multi-payer multi-split scenario
        const expenses = [
            {
                paidBy: 'u1',
                amount: 100,
                splits: [
                    { user: 'u1', amount: 25 },
                    { user: 'u2', amount: 25 },
                    { user: 'u3', amount: 25 },
                    { user: 'u4', amount: 25 }
                ]
            },
            {
                paidBy: 'u2',
                amount: 60,
                splits: [
                    { user: 'u2', amount: 30 },
                    { user: 'u3', amount: 30 }
                ]
            },
            {
                paidBy: 'u4',
                amount: 40,
                splits: [
                    { user: 'u1', amount: 20 },
                    { user: 'u4', amount: 20 }
                ]
            }
        ];
        const res = computeNetBalancesFromData(members, expenses, []);

        assert.strictEqual(res.isBalanced, true);
        assert.strictEqual(res.totalCreditorAmount, res.totalDebtorAmount);
        console.log(`     Total Creditor: $${res.totalCreditorAmount} == Total Debtor: $${res.totalDebtorAmount}`);
    }));

    // Test 6: Micro-cent 3-way rounding conservation
    record(runTest('2.8: Micro-cent split rounding conservation ($100 / 3)', () => {
        const members = [
            { _id: 'u1', name: 'Alice' },
            { _id: 'u2', name: 'Bob' },
            { _id: 'u3', name: 'Charlie' }
        ];
        // Alice pays 100, 3-way split with rounding: 33.34, 33.33, 33.33
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
        const res = computeNetBalancesFromData(members, expenses, []);
        assert.strictEqual(res.isBalanced, true);
        assert.strictEqual(res.totalCreditorAmount, res.totalDebtorAmount);
    }));

    console.log(`\n${colors.bold}═════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}RESULT: ${passed}/${total} PASSED (${Math.round(passed / total * 100)}%)${colors.reset}`);
    console.log(`${colors.bold}═════════════════════════════════════════════════════════════${colors.reset}\n`);

    if (passed < total) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
