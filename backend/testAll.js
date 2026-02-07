const API_URL = 'http://localhost:5002/api';

const runTests = async () => {
    console.log('🚀 Starting Comprehensive System Test...\n');

    // Helper functions
    const post = async (url, body, token = null) => {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        return { status: res.status, data: await res.json().catch(() => ({})) };
    };

    const get = async (url, token) => {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(url, { headers });
        return { status: res.status, data: await res.json().catch(() => ({})) };
    };

    try {
        // --- 1. Authentication ---
        console.log('1️⃣  Testing Authentication...');
        const timestamp = Date.now();
        const user1 = { name: 'TestUser1', email: `u1_${timestamp}@test.com`, password: 'password123' };
        const user2 = { name: 'TestUser2', email: `u2_${timestamp}@test.com`, password: 'password123' };

        // Register
        const reg1 = await post(`${API_URL}/auth/register`, user1);
        const reg2 = await post(`${API_URL}/auth/register`, user2);

        if (reg1.status !== 201 || reg2.status !== 201) throw new Error('Registration failed');
        console.log('   ✅ Registration successful');

        const token1 = reg1.data.data.token;
        const id1 = reg1.data.data.user.id;
        const token2 = reg2.data.data.token;
        const id2 = reg2.data.data.user.id;

        // Login
        const login1 = await post(`${API_URL}/auth/login`, { email: user1.email, password: user1.password });
        if (login1.status !== 200) throw new Error('Login failed');
        console.log('   ✅ Login successful');

        // Invalid Login
        const failLogin = await post(`${API_URL}/auth/login`, { email: user1.email, password: 'wrongpassword' });
        if (failLogin.status !== 401 && failLogin.status !== 400) throw new Error('Invalid login check failed');
        console.log('   ✅ Invalid login rejected correctly');


        // --- 2. Groups ---
        console.log('\n2️⃣  Testing Groups...');
        // Create Group
        const groupRes = await post(`${API_URL}/groups`, {
            name: 'Integration Test Group',
            members: [id2]
        }, token1);

        if (groupRes.status !== 201) throw new Error('Group creation failed');
        const groupId = groupRes.data.data._id;
        console.log('   ✅ Group created');

        // Fetch Groups
        const getGroups = await get(`${API_URL}/groups`, token1);
        if (getGroups.status !== 200 || getGroups.data.data.length === 0) throw new Error('Fetch groups failed');
        console.log('   ✅ Groups fetched');


        // --- 3. Expenses ---
        console.log('\n3️⃣  Testing Expenses...');
        // Equal Split (100 -> 50/50)
        const exp1 = await post(`${API_URL}/groups/${groupId}/expenses`, {
            description: 'Lunch',
            amount: 100,
            payer: id1,
            splitType: 'EQUAL'
        }, token1);
        if (exp1.status !== 201) throw new Error('Equal split expense failed');

        // Unequal Split (Bob pays 50 -> Alice: 20, Bob: 30)
        // Alice Net Change: -20. Bob Net Change: +20.
        // Previous Balance (from Exp1): Alice +50, Bob -50.
        // New Balance: Alice +30, Bob -30.
        const exp2 = await post(`${API_URL}/groups/${groupId}/expenses`, {
            description: 'Snacks',
            amount: 50,
            payer: id2,
            splitType: 'UNEQUAL',
            splits: [
                { user: id1, amount: 20 },
                { user: id2, amount: 30 }
            ]
        }, token1);
        if (exp2.status !== 201) throw new Error('Unequal split expense failed');
        console.log('   ✅ Expenses added');

        // Invalid Expense (Negative Amount)
        const failExp = await post(`${API_URL}/groups/${groupId}/expenses`, {
            description: 'Invalid',
            amount: -50,
            payer: id1,
            splitType: 'EQUAL'
        }, token1);
        if (failExp.status !== 400) throw new Error('Negative amount check failed');
        console.log('   ✅ Invalid expense rejected');


        // --- 4. Balances ---
        console.log('\n4️⃣  Testing Balances...');
        const balRes = await get(`${API_URL}/groups/${groupId}/balances`, token1);
        const aliceBal = balRes.data.data.find(b => b.user._id === id1).balance;
        const bobBal = balRes.data.data.find(b => b.user._id === id2).balance;

        // Expect: Alice +30, Bob -30
        if (aliceBal !== 30 || bobBal !== -30) {
            console.log(`   ❌ Balances mismatch! Alice: ${aliceBal}, Bob: ${bobBal}`);
            throw new Error('Balance calculation incorrect');
        }
        console.log('   ✅ Balances correct');


        // --- 5. Settlements ---
        console.log('\n5️⃣  Testing Settlements...');
        // Optimization Check
        const optRes = await get(`${API_URL}/groups/${groupId}/settlements/optimized`, token1);
        const suggestion = optRes.data.data[0];

        // Expect Bob -> Alice: 30
        if (!suggestion || suggestion.from.email !== user2.email || suggestion.to.email !== user1.email || suggestion.amount !== 30) {
            console.log('   ❌ Optimization mismatch:', suggestion);
        } else {
            console.log('   ✅ Optimization suggestion correct');
        }

        // Settle
        const settleRes = await post(`${API_URL}/groups/${groupId}/settlements`, {
            payee: id1,
            amount: 30
        }, token2); // Bob pays
        if (settleRes.status !== 201) throw new Error('Settlement creation failed');

        // Verify Final Balance
        const finalBalRes = await get(`${API_URL}/groups/${groupId}/balances`, token1);
        const aliceFinal = finalBalRes.data.data.find(b => b.user._id === id1).balance;

        if (aliceFinal !== 0) throw new Error(`Final balance not zero: ${aliceFinal}`);
        console.log('   ✅ Settlement verified (Balances zeroed)');


        // --- 6. Transaction History ---
        console.log('\n6️⃣  Testing Transaction History...');
        const histRes = await get(`${API_URL}/groups/${groupId}/transactions`, token1);
        // Expect 3 transactions: Settlement, Exp2, Exp1
        if (histRes.data.data.length !== 3) throw new Error('Transaction history count incorrect');
        console.log('   ✅ Transaction history verified');


        console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        process.exit(1);
    }
};

runTests();
