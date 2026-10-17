const assert = require('assert');
const PORT = process.env.PORT || 5001;
const API_URL = `http://localhost:${PORT}/api`;

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

async function post(url, body, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data, ok: res.ok };
}

async function get(url, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data, ok: res.ok };
}

async function runTest(name, fn) {
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
    console.log(`\n${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}   TASKS 5 & 6: OPTIMIZED SETTLEMENT API & STATS TEST SUITE  ${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}\n`);

    let passed = 0;
    let total = 0;
    const record = (res) => { total++; if (res) passed++; };

    const ts = Date.now();
    // Register 3 users: Alice (creator), Bob (member), Charlie (outsider)
    const u1 = await post(`${API_URL}/auth/register`, { name: 'Alice_Opt', email: `alice_opt_${ts}@test.com`, password: 'password123' });
    const u2 = await post(`${API_URL}/auth/register`, { name: 'Bob_Opt', email: `bob_opt_${ts}@test.com`, password: 'password123' });
    const u3 = await post(`${API_URL}/auth/register`, { name: 'Charlie_Outsider', email: `charlie_out_${ts}@test.com`, password: 'password123' });

    const tokenAlice = u1.data.token || u1.data.data?.token;
    const idAlice = u1.data.user?.id || u1.data.data?.user?.id;
    const tokenBob = u2.data.token || u2.data.data?.token;
    const idBob = u2.data.user?.id || u2.data.data?.user?.id;
    const tokenCharlie = u3.data.token || u3.data.data?.token;

    // Create group with Alice & Bob
    const groupRes = await post(`${API_URL}/groups`, {
        name: 'Optimization Test Group',
        members: [idBob]
    }, tokenAlice);
    const groupId = groupRes.data._id || groupRes.data.data?._id;

    // 5.2 Validate groupId
    record(await runTest('5.2: Reject invalid groupId format with 400 Bad Request', async () => {
        const res = await get(`${API_URL}/groups/invalid-group-id/settlements/optimized`, tokenAlice);
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.data.success, false);
    }));

    // 5.3 Verify authentication
    record(await runTest('5.3: Reject unauthenticated request with 401 Unauthorized', async () => {
        const res = await get(`${API_URL}/groups/${groupId}/settlements/optimized`, null);
        assert.strictEqual(res.status, 401);
    }));

    // 5.4 Verify group membership (non-member Charlie rejected)
    record(await runTest('5.4: Reject non-member with 403 Forbidden', async () => {
        const res = await get(`${API_URL}/groups/${groupId}/settlements/optimized`, tokenCharlie);
        assert.strictEqual(res.status, 403);
        assert.strictEqual(res.data.success, false);
    }));

    // 5.10 Proper error handling for non-existent group
    record(await runTest('5.10: Return 404 for non-existent valid ObjectId group', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        const res = await get(`${API_URL}/groups/${fakeId}/settlements/optimized`, tokenAlice);
        assert.strictEqual(res.status, 404);
        assert.strictEqual(res.data.success, false);
    }));

    // 6.6 Accurate statistics for empty/already-settled group
    record(await runTest('6.6: Accurate statistics for empty / 0-expense group', async () => {
        const res = await get(`${API_URL}/groups/${groupId}/settlements/optimized`, tokenAlice);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.success, true);
        assert.strictEqual(res.data.totalTransactions, 0);
        assert.strictEqual(res.data.stats.originalTransactionsCount, 0);
        assert.strictEqual(res.data.stats.optimizedTransactionsCount, 0);
        assert.strictEqual(res.data.stats.transactionsSaved, 0);
        assert.strictEqual(res.data.stats.reductionPercentage, 0);
    }));

    // Add expenses to create debts:
    // Alice pays 100 split 50/50 with Bob -> Bob owes Alice 50
    await post(`${API_URL}/groups/${groupId}/expenses`, {
        description: 'Dinner',
        amount: 100,
        paidBy: idAlice,
        splits: [
            { user: idAlice, amount: 50 },
            { user: idBob, amount: 50 }
        ]
    }, tokenAlice);

    // 5.1, 5.5 - 5.9 & 6.1 - 6.5: Verify full optimization and statistics
    record(await runTest('5.1, 5.8, 5.9, 6.1-6.5: Optimized settlements, balances, and stats', async () => {
        const res = await get(`${API_URL}/groups/${groupId}/settlements/optimized`, tokenAlice);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.success, true);

        // 5.8 Optimized settlement list
        assert.strictEqual(res.data.optimizedTransactions.length, 1);
        const tx = res.data.optimizedTransactions[0];
        assert.strictEqual((tx.fromUser?._id || tx.fromUser).toString(), idBob.toString());
        assert.strictEqual((tx.toUser?._id || tx.toUser).toString(), idAlice.toString());
        assert.strictEqual(tx.amount, 50);

        // 5.9 Member balance info
        assert.strictEqual(res.data.balances.length, 2);
        assert.strictEqual(res.data.isBalanced, true);
        assert.strictEqual(res.data.totalCreditorAmount, 50);
        assert.strictEqual(res.data.totalDebtorAmount, 50);

        // 6.1 - 6.5 Optimization stats
        assert.strictEqual(res.data.stats.originalTransactionsCount, 1);
        assert.strictEqual(res.data.stats.optimizedTransactionsCount, 1);
        assert.strictEqual(res.data.stats.transactionsSaved, 0);
        assert.strictEqual(res.data.stats.reductionPercentage, 0);
    }));

    // Bob settles the 50 to Alice
    await post(`${API_URL}/groups/${groupId}/settlements`, {
        fromUser: idBob,
        toUser: idAlice,
        amount: 50,
        notes: 'Settled full balance'
    }, tokenBob);

    // Verify after settlement: group is now fully settled
    record(await runTest('6.6: Statistics and recommendations after full settlement', async () => {
        const res = await get(`${API_URL}/groups/${groupId}/settlements/optimized`, tokenAlice);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.optimizedTransactions.length, 0);
        assert.strictEqual(res.data.totalTransactions, 0);
        assert.strictEqual(res.data.totalCreditorAmount, 0);
        assert.strictEqual(res.data.totalDebtorAmount, 0);
    }));

    console.log(`\n${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}RESULT: ${passed}/${total} PASSED (${Math.round(passed / total * 100)}%)${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}\n`);

    if (passed < total) process.exit(1);
}

main().catch(err => {
    console.error('Test script error:', err);
    process.exit(1);
});
