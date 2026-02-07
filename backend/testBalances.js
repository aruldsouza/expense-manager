const API_URL = 'http://localhost:5002/api';

const runTests = async () => {
    try {
        console.log('Testing Balance APIs...');

        // Helper function for fetch
        const post = async (url, body, token = null) => {
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });
            const text = await res.text();
            try {
                const data = JSON.parse(text);
                if (!res.ok) throw new Error(data.error || data.message || res.statusText);
                return data;
            } catch (e) {
                console.log('Failed to parse JSON:', text);
                throw new Error(`Server returned non-JSON response: ${res.status} ${res.statusText}`);
            }
        };

        const get = async (url, token) => {
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(url, { headers });
            const text = await res.text();
            try {
                const data = JSON.parse(text);
                if (!res.ok) throw new Error(data.error || data.message || res.statusText);
                return data;
            } catch (e) {
                console.log('Failed to parse JSON:', text);
                throw new Error(`Server returned non-JSON response: ${res.status} ${res.statusText}`);
            }
        };

        // 1. Register 2 users
        const userEmail1 = `user1_${Date.now()}@example.com`;
        const userEmail2 = `user2_${Date.now()}@example.com`;

        console.log(`\n1. Registering users...`);
        const u1 = await post(`${API_URL}/auth/register`, { name: 'Alice', email: userEmail1, password: 'password123' });
        const u2 = await post(`${API_URL}/auth/register`, { name: 'Bob', email: userEmail2, password: 'password123' });

        const token1 = u1.data.token;
        const id1 = u1.data.user.id;
        const id2 = u2.data.user.id;
        console.log('Users registered.');

        // 2. Create Group with both users
        console.log(`\n2. Creating Group...`);
        const groupRes = await post(`${API_URL}/groups`, {
            name: 'Balance Test Group',
            members: [id2]
        }, token1);
        const groupId = groupRes.data._id;
        console.log('Group created.');

        // 3. Add Expense 1: Alice pays 100, split 50/50
        console.log(`\n3. Alice pays 100 (50/50)...`);
        await post(`${API_URL}/groups/${groupId}/expenses`, {
            description: 'Lunch',
            amount: 100,
            payer: id1,
            splitType: 'EQUAL'
        }, token1);

        // 4. Add Expense 2: Bob pays 50, Alice owes 20, Bob owes 30
        console.log(`\n4. Bob pays 50 (Alice:20, Bob:30)...`);
        await post(`${API_URL}/groups/${groupId}/expenses`, {
            description: 'Snacks',
            amount: 50,
            payer: id2,
            splitType: 'UNEQUAL',
            splits: [
                { user: id1, amount: 20 },
                { user: id2, amount: 30 }
            ]
        }, token1);

        // Expected Net:
        // Alice: Paid 100. Owes 50 (Exp1) + 20 (Exp2) = 70. Net: +30.
        // Bob: Paid 50. Owes 50 (Exp1) + 30 (Exp2) = 80. Net: -30.

        // 5. Fetch Balances
        console.log(`\n5. Fetching Balances...`);
        const balanceRes = await get(`${API_URL}/groups/${groupId}/balances`, token1);

        const aliceBal = balanceRes.data.find(b => b.user._id === id1);
        const bobBal = balanceRes.data.find(b => b.user._id === id2);

        console.log('Alice Balance:', aliceBal.balance);
        console.log('Bob Balance:', bobBal.balance);

        if (aliceBal.balance === 30 && bobBal.balance === -30) {
            console.log('\nSUCCESS: Balances match expected values (+30 / -30).');
        } else {
            console.log('\nFAILURE: Balances do not match expected values.');
        }

    } catch (error) {
        console.error('\nTest failed:', error.message);
    }
};

runTests();
