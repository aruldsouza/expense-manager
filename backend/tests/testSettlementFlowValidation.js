const assert = require('assert');

const PORT = process.env.PORT || 5001;
const API_URL = `http://localhost:${PORT}/api`;

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
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

async function runSuite() {
    console.log(`\n${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}   TASK 11: SETTLEMENT FLOW & BACKEND VALIDATION SUITE       ${colors.reset}`);
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
    const u1 = await post(`${API_URL}/auth/register`, { name: 'Alice', email: `al_${suffix}@test.com`, password: 'password123' });
    const u2 = await post(`${API_URL}/auth/register`, { name: 'Bob', email: `bob_${suffix}@test.com`, password: 'password123' });
    const u3 = await post(`${API_URL}/auth/register`, { name: 'Charlie', email: `ch_${suffix}@test.com`, password: 'password123' });
    const uStranger = await post(`${API_URL}/auth/register`, { name: 'Stranger', email: `st_${suffix}@test.com`, password: 'password123' });


    const getUser = (res) => res.data?.data?.user || res.data?.user || {};
    const getToken = (res) => res.data?.data?.token || res.data?.token || '';

    const tokenAlice = getToken(u1);
    const tokenBob = getToken(u2);
    const tokenStranger = getToken(uStranger);

    const idAlice = (getUser(u1)._id || getUser(u1).id).toString();
    const idBob = (getUser(u2)._id || getUser(u2).id).toString();
    const idCharlie = (getUser(u3)._id || getUser(u3).id).toString();
    const idStranger = (getUser(uStranger)._id || getUser(uStranger).id).toString();


    // Create group with Alice, Bob, Charlie
    const grp = await post(`${API_URL}/groups`, {
        name: 'Validation Test Group',
        members: [idBob, idCharlie]
    }, tokenAlice);
    const grpObj = grp.data.data || grp.data.group || grp.data;
    const groupId = (grpObj._id || grpObj.id).toString();

    // Alice pays 300 (split equal: Alice gets +200, Bob owes -100, Charlie owes -100)
    await post(`${API_URL}/groups/${groupId}/expenses`, {
        description: 'Dinner Party',
        amount: 300,
        payer: idAlice,
        splitType: 'EQUAL'
    }, tokenAlice);

    // 11.5: Reject non-positive amounts
    await test('11.5: Reject zero and negative settlement amount with 400', async () => {
        const resZero = await post(`${API_URL}/groups/${groupId}/settlements`, {
            payer: idBob, payee: idAlice, amount: 0
        }, tokenBob);
        assert.strictEqual(resZero.status, 400);

        const resNeg = await post(`${API_URL}/groups/${groupId}/settlements`, {
            payer: idBob, payee: idAlice, amount: -50
        }, tokenBob);
        assert.strictEqual(resNeg.status, 400);
    });

    // 11.5: Reject self settlement
    await test('11.5: Reject self settlement with 400', async () => {
        const res = await post(`${API_URL}/groups/${groupId}/settlements`, {
            payer: idBob, payee: idBob, amount: 50
        }, tokenBob);
        assert.strictEqual(res.status, 400);
    });

    // 11.5: Reject non-member settlement
    await test('11.5: Reject non-member participation with 400', async () => {
        const res = await post(`${API_URL}/groups/${groupId}/settlements`, {
            payer: idStranger, payee: idAlice, amount: 50
        }, tokenStranger);
        assert.strictEqual(res.status, 400);
    });

    // 11.5: Reject settlement when debtor owes nothing (Alice is creditor, net +200)
    await test('11.5: Reject settlement from non-debtor (payer owes 0 or is creditor)', async () => {
        const res = await post(`${API_URL}/groups/${groupId}/settlements`, {
            payer: idAlice, payee: idBob, amount: 50
        }, tokenAlice);
        assert.strictEqual(res.status, 400);
    });

    // 11.5: Reject settlement amount that exceeds debtor outstanding balance
    await test('11.5: Reject settlement amount exceeding debtor outstanding debt (Bob owes 100, pays 150)', async () => {
        const res = await post(`${API_URL}/groups/${groupId}/settlements`, {
            payer: idBob, payee: idAlice, amount: 150
        }, tokenBob);
        assert.strictEqual(res.status, 400);
    });

    // Test GET /debt endpoint
    await test('11.2 & 11.3: GET /api/groups/:groupId/settlements/debt returns accurate live debt', async () => {
        const res = await get(`${API_URL}/groups/${groupId}/settlements/debt?payer=${idBob}&payee=${idAlice}`, tokenBob);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.success, true);
        assert.strictEqual(res.data.data.outstanding, 100);
    });

    // Successful partial settlement (Bob pays 40 of 100)
    await test('11.3 & 11.6: Successfully record valid partial settlement (Bob pays 40 of 100)', async () => {
        const res = await post(`${API_URL}/groups/${groupId}/settlements`, {
            payer: idBob, payee: idAlice, amount: 40, notes: 'Partial lunch settlement'
        }, tokenBob);
        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.data.success, true);
        assert.strictEqual(res.data.meta.wasPartial, true);
        assert.strictEqual(res.data.meta.remainingDebt, 60);
    });

    // 11.4: Prevent duplicate settlement records (identical settlement within 15 seconds)
    await test('11.4: Prevent duplicate settlement records within 15s window with 409 Conflict', async () => {
        const resDup = await post(`${API_URL}/groups/${groupId}/settlements`, {
            payer: idBob, payee: idAlice, amount: 40, notes: 'Accidental double click'
        }, tokenBob);
        assert.strictEqual(resDup.status, 409);
        assert.strictEqual(resDup.data.success, false);
        assert.match(resDup.data.error, /duplicate/i);
    });

    // 11.8 & 11.9: Settle remainder (Bob pays remaining 60) and verify removal from suggestions
    await test('11.8 & 11.9: Settle remaining debt and verify it is removed from suggestions', async () => {
        const res = await post(`${API_URL}/groups/${groupId}/settlements`, {
            payer: idBob, payee: idAlice, amount: 60, notes: 'Full settlement of remaining debt'
        }, tokenBob);
        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.data.meta.wasPartial, false);
        assert.strictEqual(res.data.meta.remainingDebt, 0);

        // Check optimized settlements: Bob should no longer be present in suggestions!
        const optRes = await get(`${API_URL}/groups/${groupId}/settlements/optimized`, tokenAlice);
        assert.strictEqual(optRes.status, 200);
        const suggestions = optRes.data.optimizedTransactions || optRes.data.data || [];
        const bobSuggested = suggestions.find(s => (s.fromUser?._id || s.from?._id || s.from).toString() === idBob);
        assert.strictEqual(bobSuggested, undefined);

        // Only Charlie -> Alice (100) should remain
        assert.strictEqual(suggestions.length, 1);
        assert.strictEqual((suggestions[0].fromUser?._id || suggestions[0].from).toString(), idCharlie);
        assert.strictEqual(suggestions[0].amount, 100);
    });

    console.log(`\n${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`RESULT: ${passed}/${passed + failed} PASSED (${Math.round((passed / (passed + failed)) * 100)}%)`);
    console.log(`${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}\n`);

    if (failed > 0) process.exit(1);
}

runSuite().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
