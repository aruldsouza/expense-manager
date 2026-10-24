const assert = require('assert');

const PORT = process.env.PORT || 5001;
const API_URL = `http://localhost:${PORT}/api`;

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    bold: '\x1b[1m'
};

const post = async (url, body, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (_) {
        data = { text };
    }
    return { status: res.status, ok: res.ok, data };
};

const get = async (url, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (_) {
        data = { text };
    }
    return { status: res.status, ok: res.ok, data };
};

async function runTask12Tests() {
    console.log(`\n${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}   TASK 12: FINAL END-TO-END VALIDATION & SYSTEM TEST SUITE  ${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}\n`);

    let passed = 0;
    let failed = 0;

    const test = async (name, fn) => {
        try {
            await fn();
            console.log(`  ${colors.green}✔ PASS:${colors.reset} ${name}`);
            passed++;
        } catch (err) {
            console.log(`  ${colors.red}✖ FAIL:${colors.reset} ${name}\n     ${err.message}`);
            failed++;
        }
    };

    const suffix = Date.now();
    const reg = async (name, emailPrefix) => {
        const res = await post(`${API_URL}/auth/register`, {
            name,
            email: `${emailPrefix}_${suffix}@test.com`,
            password: 'password123'
        });
        const user = res.data?.data?.user || res.data?.user;
        const token = res.data?.data?.token || res.data?.token;
        return { user, token, id: (user._id || user.id).toString() };
    };

    // 12.8: Auth & Authorization Test
    await test('12.8: Authentication and Authorization verification', async () => {
        const u = await reg('AuthTester', 'authtest');
        assert.ok(u.token, 'Token generated on registration');

        // Login with valid credentials
        const loginRes = await post(`${API_URL}/auth/login`, {
            email: u.user.email,
            password: 'password123'
        });
        assert.strictEqual(loginRes.status, 200);

        // Login with bad password
        const badLogin = await post(`${API_URL}/auth/login`, {
            email: u.user.email,
            password: 'wrongpassword'
        });
        assert.strictEqual(badLogin.status, 400);

        // Unauthenticated access
        const unauth = await get(`${API_URL}/groups/6adc55a124f9bd160179f8f8/settlements/optimized`, null);
        assert.strictEqual(unauth.status, 401);
    });

    // 12.2: Test complete flow: Expenses -> Balances -> Simplify Debts -> Settlement
    await test('12.2: Complete Flow (Expenses → Balances → Simplify Debts → Settlement)', async () => {
        const u1 = await reg('UserA', 'usera');
        const u2 = await reg('UserB', 'userb');

        // Create group
        const grpRes = await post(`${API_URL}/groups`, {
            name: 'Flow Test Group',
            members: [u2.id]
        }, u1.token);
        const grpObj = grpRes.data?.data || grpRes.data?.group || grpRes.data;
        const groupId = (grpObj._id || grpObj.id).toString();

        // Add expense: UserA pays 200, equal split
        const expRes = await post(`${API_URL}/groups/${groupId}/expenses`, {
            description: 'Groceries',
            amount: 200,
            payer: u1.id,
            splitType: 'EQUAL'
        }, u1.token);
        assert.strictEqual(expRes.status, 201);

        // Verify balances: UserA = +100, UserB = -100
        const balRes = await get(`${API_URL}/groups/${groupId}/balances`, u1.token);
        const balList = Array.isArray(balRes.data) ? balRes.data : balRes.data?.data;
        const balA = balList.find(b => (b.user?._id || b.user).toString() === u1.id).balance;
        const balB = balList.find(b => (b.user?._id || b.user).toString() === u2.id).balance;
        assert.strictEqual(balA, 100);
        assert.strictEqual(balB, -100);

        // Fetch simplified debts
        const optRes = await get(`${API_URL}/groups/${groupId}/settlements/optimized`, u1.token);
        assert.strictEqual(optRes.status, 200);
        const optList = optRes.data.optimizedTransactions || optRes.data.data;
        assert.strictEqual(optList.length, 1);
        assert.strictEqual(optList[0].amount, 100);
        assert.strictEqual((optList[0].fromUser?._id || optList[0].from).toString(), u2.id);
        assert.strictEqual((optList[0].toUser?._id || optList[0].to).toString(), u1.id);

        // Execute settlement: UserB pays UserA 100
        const settleRes = await post(`${API_URL}/groups/${groupId}/settlements`, {
            payer: u2.id,
            payee: u1.id,
            amount: 100,
            notes: 'Settled via flow test'
        }, u2.token);
        assert.strictEqual(settleRes.status, 201);

        // Check balances are now zeroed
        const postBalRes = await get(`${API_URL}/groups/${groupId}/balances`, u1.token);
        const postBalList = Array.isArray(postBalRes.data) ? postBalRes.data : postBalRes.data?.data;
        const postA = postBalList.find(b => (b.user?._id || b.user).toString() === u1.id).balance;
        const postB = postBalList.find(b => (b.user?._id || b.user).toString() === u2.id).balance;
        assert.strictEqual(postA, 0);
        assert.strictEqual(postB, 0);

        // Optimized debts should now be completely empty
        const postOptRes = await get(`${API_URL}/groups/${groupId}/settlements/optimized`, u1.token);
        assert.strictEqual((postOptRes.data.optimizedTransactions || []).length, 0);
    });

    // 12.3: Test circular debt scenario end-to-end
    // A -> B (A pays for B $50), B -> C (B pays for C $50), C -> A (C pays for A $50)
    // Result: Net balance for everyone = 0, optimized transactions = 0!
    await test('12.3: Circular Debt Scenario (A -> B -> C -> A naturally eliminates all transactions)', async () => {
        const uA = await reg('CircA', 'circa');
        const uB = await reg('CircB', 'circb');
        const uC = await reg('CircC', 'circc');

        const grpRes = await post(`${API_URL}/groups`, {
            name: 'Circular Debt Group',
            members: [uB.id, uC.id]
        }, uA.token);
        const groupId = (grpRes.data.data?._id || grpRes.data._id || grpRes.data.group?._id).toString();

        // 1. A pays 50 for B (Unequal: B owes 50)
        await post(`${API_URL}/groups/${groupId}/expenses`, {
            description: 'A paid for B',
            amount: 50,
            payer: uA.id,
            splitType: 'UNEQUAL',
            splits: [{ user: uB.id, amount: 50 }]
        }, uA.token);

        // 2. B pays 50 for C (Unequal: C owes 50)
        await post(`${API_URL}/groups/${groupId}/expenses`, {
            description: 'B paid for C',
            amount: 50,
            payer: uB.id,
            splitType: 'UNEQUAL',
            splits: [{ user: uC.id, amount: 50 }]
        }, uB.token);

        // 3. C pays 50 for A (Unequal: A owes 50)
        await post(`${API_URL}/groups/${groupId}/expenses`, {
            description: 'C paid for A',
            amount: 50,
            payer: uC.id,
            splitType: 'UNEQUAL',
            splits: [{ user: uA.id, amount: 50 }]
        }, uC.token);

        // Verify Net Balances: Everyone should be 0!
        const balRes = await get(`${API_URL}/groups/${groupId}/balances`, uA.token);
        const balList = Array.isArray(balRes.data) ? balRes.data : balRes.data?.data;
        balList.forEach(b => {
            assert.strictEqual(b.balance, 0, `Member ${b.user?.name} balance must be 0`);
        });

        // Verify Optimized Settlements: 0 transactions needed
        const optRes = await get(`${API_URL}/groups/${groupId}/settlements/optimized`, uA.token);
        const optList = optRes.data.optimizedTransactions || optRes.data.data;
        assert.strictEqual(optList.length, 0);
        assert.strictEqual(optRes.data.totalDebtorAmount, 0);
        assert.strictEqual(optRes.data.totalCreditorAmount, 0);
    });

    // 12.4: Test multiple debtor / creditor scenario
    await test('12.4: Multiple Debtors & Creditors Scenario (5 Members, 10 Pairwise → Minimized)', async () => {
        const u1 = await reg('M1', 'm1');
        const u2 = await reg('M2', 'm2');
        const u3 = await reg('M3', 'm3');
        const u4 = await reg('M4', 'm4');
        const u5 = await reg('M5', 'm5');

        const grpRes = await post(`${API_URL}/groups`, {
            name: 'Multi-Member Group',
            members: [u2.id, u3.id, u4.id, u5.id]
        }, u1.token);
        const groupId = (grpRes.data.data?._id || grpRes.data._id || grpRes.data.group?._id).toString();

        // M1 pays 500 (equal split 100 each) -> M1 Net +400, M2..M5 Net -100 each
        await post(`${API_URL}/groups/${groupId}/expenses`, {
            description: 'Villa Rental',
            amount: 500,
            payer: u1.id,
            splitType: 'EQUAL'
        }, u1.token);

        // M2 pays 200 (equal split 40 each) -> M2 Net +160 - 100 = +60
        await post(`${API_URL}/groups/${groupId}/expenses`, {
            description: 'Groceries',
            amount: 200,
            payer: u2.id,
            splitType: 'EQUAL'
        }, u2.token);

        const optRes = await get(`${API_URL}/groups/${groupId}/settlements/optimized`, u1.token);
        assert.strictEqual(optRes.status, 200);
        const optList = optRes.data.optimizedTransactions || optRes.data.data;

        // Total creditors: M1 (+360), M2 (+60) = +420
        // Total debtors: M3 (-140), M4 (-140), M5 (-140) = -420
        // Minimized transactions should be at most 4 (greedy minimization)
        assert.ok(optList.length <= 4, `Expected <= 4 transactions, got ${optList.length}`);
        assert.strictEqual(optRes.data.totalDebtorAmount, 420);
        assert.strictEqual(optRes.data.totalCreditorAmount, 420);
        assert.strictEqual(optRes.data.isBalanced, true);
    });

    // 12.6 & 12.7: Test existing expense & settlement functionality integrity
    await test('12.6 & 12.7: Existing expense & settlement features remain fully functional', async () => {
        const u1 = await reg('ExpTester1', 'expt1');
        const u2 = await reg('ExpTester2', 'expt2');

        const grpRes = await post(`${API_URL}/groups`, {
            name: 'Expense Integrity Group',
            members: [u2.id]
        }, u1.token);
        const groupId = (grpRes.data.data?._id || grpRes.data._id || grpRes.data.group?._id).toString();

        // 1. Add expense with notes
        const exp = await post(`${API_URL}/groups/${groupId}/expenses`, {
            description: 'Taxi Ride',
            amount: 80,
            payer: u1.id,
            splitType: 'EQUAL',
            category: 'Transportation'
        }, u1.token);
        assert.strictEqual(exp.status, 201);

        // 2. Fetch expenses
        const expListRes = await get(`${API_URL}/groups/${groupId}/expenses`, u1.token);
        const expList = expListRes.data.data || expListRes.data;
        assert.strictEqual(expList.length, 1);
        assert.strictEqual(expList[0].title || expList[0].description, 'Taxi Ride');


        // 3. Record partial settlement
        const settleRes = await post(`${API_URL}/groups/${groupId}/settlements`, {
            payer: u2.id,
            payee: u1.id,
            amount: 20,
            notes: 'Half of taxi debt'
        }, u2.token);
        assert.strictEqual(settleRes.status, 201);

        // 4. Fetch settlements list
        const settleListRes = await get(`${API_URL}/groups/${groupId}/settlements`, u1.token);
        const settleList = settleListRes.data.data || settleListRes.data;
        assert.strictEqual(settleList.length, 1);
        assert.strictEqual(settleList[0].amount, 20);
    });

    console.log(`\n${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`RESULT: ${passed}/${passed + failed} PASSED (${Math.round((passed / (passed + failed)) * 100)}%)`);
    console.log(`${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}\n`);

    if (failed > 0) process.exit(1);
}

runTask12Tests().catch(err => {
    console.error('Task 12 test suite failed:', err);
    process.exit(1);
});
