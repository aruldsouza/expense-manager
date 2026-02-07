const API_URL = 'http://localhost:5002/api';

const runTests = async () => {
    try {
        console.log('Testing Transaction History APIs...');

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

        // 1. Register 2 users: Alice, Bob
        const emailSuffix = Date.now();
        const u1 = await post(`${API_URL}/auth/register`, { name: 'Alice', email: `alice_${emailSuffix}@example.com`, password: 'password123' });
        const u2 = await post(`${API_URL}/auth/register`, { name: 'Bob', email: `bob_${emailSuffix}@example.com`, password: 'password123' });

        const token1 = u1.data.token;
        const id1 = u1.data.user.id;
        const id2 = u2.data.user.id;
        console.log('Users registered.');

        // 2. Create Group
        console.log(`\n2. Creating Group...`);
        const groupRes = await post(`${API_URL}/groups`, {
            name: 'Transaction Test Group',
            members: [id2]
        }, token1);
        const groupId = groupRes.data._id;
        console.log('Group created.');

        // 3. Add Expense 1: Lunch ($100)
        console.log(`\n3. Alice pays 100 (Lunch)...`);
        await post(`${API_URL}/groups/${groupId}/expenses`, {
            description: 'Lunch',
            amount: 100,
            payer: id1,
            splitType: 'EQUAL'
        }, token1);

        // Wait 1 second to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 4. Add Expense 2: Coffee ($20)
        console.log(`\n4. Alice pays 20 (Coffee)...`);
        await post(`${API_URL}/groups/${groupId}/expenses`, {
            description: 'Coffee',
            amount: 20,
            payer: id1,
            splitType: 'EQUAL'
        }, token1);

        // Wait 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 5. Add Settlement: Bob pays Alice $60
        console.log(`\n5. Bob pays Alice 60 (Settlement)...`);
        await post(`${API_URL}/groups/${groupId}/settlements`, {
            payee: id1,
            amount: 60
        }, u2.data.token);

        // 6. Fetch Transactions
        console.log(`\n6. Fetching Transactions...`);
        const transRes = await get(`${API_URL}/groups/${groupId}/transactions`, token1);
        const transactions = transRes.data;

        console.log(`Fetched ${transactions.length} transactions.`);

        if (transactions.length !== 3) {
            throw new Error(`Expected 3 transactions, got ${transactions.length}`);
        }

        // Check Order (Newest First)
        console.log('Transaction Order:');
        transactions.forEach(t => console.log(`- ${t.date} | ${t.type} | ${t.description} | $${t.amount}`));

        const t1 = transactions[0]; // Should be Settlement
        const t2 = transactions[1]; // Should be Coffee
        const t3 = transactions[2]; // Should be Lunch

        if (t1.type === 'SETTLEMENT' && t2.description === 'Coffee' && t3.description === 'Lunch') {
            console.log('\nSUCCESS: Transactions are ordered correctly (Newest First).');
        } else {
            console.log('\nFAILURE: Transaction order is incorrect.');
        }

    } catch (error) {
        console.error('\nTest failed:', error.message);
    }
};

runTests();
