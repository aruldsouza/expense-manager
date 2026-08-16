const API_URL = 'http://localhost:5002/api';

const runTests = async () => {
    try {
        console.log('Testing Expense APIs...');

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
        const u1 = await post(`${API_URL}/auth/register`, { name: 'User 1', email: userEmail1, password: 'password123' });
        const u2 = await post(`${API_URL}/auth/register`, { name: 'User 2', email: userEmail2, password: 'password123' });

        const token1 = u1.data.token;
        const id1 = u1.data.user.id;
        const id2 = u2.data.user.id;
        console.log('Users registered. IDs:', id1, id2);

        // 2. Create Group with both users
        console.log(`\n2. Creating Group...`);
        const groupRes = await post(`${API_URL}/groups`, {
            name: 'Expense Test Group',
            members: [id2]
        }, token1);
        const groupId = groupRes.data._id;
        console.log('Group created.');

        // 3. Add Expense - EQUAL Split
        console.log(`\n3. Adding Expense (EQUAL Split)...`);
        const exp1 = await post(`${API_URL}/groups/${groupId}/expenses`, {
            description: 'Lunch',
            amount: 100,
            payer: id1,
            splitType: 'EQUAL'
        }, token1);
        console.log('Expense added:', exp1.data.amount, exp1.data.splitType);
        console.log('Splits:', exp1.data.splits);

        // 4. Add Expense - UNEQUAL Split
        console.log(`\n4. Adding Expense (UNEQUAL Split)...`);
        const exp2 = await post(`${API_URL}/groups/${groupId}/expenses`, {
            description: 'Dinner',
            amount: 200,
            payer: id1,
            splitType: 'UNEQUAL',
            splits: [
                { user: id1, amount: 50 },
                { user: id2, amount: 150 }
            ]
        }, token1);
        console.log('Expense added:', exp2.data.amount, exp2.data.splitType);

        // 5. Add Expense - PERCENT Split
        console.log(`\n5. Adding Expense (PERCENT Split)...`);
        const exp3 = await post(`${API_URL}/groups/${groupId}/expenses`, {
            description: 'Snacks',
            amount: 50,
            payer: id2,
            splitType: 'PERCENT',
            splits: [
                { user: id1, percent: 20 },
                { user: id2, percent: 80 }
            ]
        }, token1);
        console.log('Expense added:', exp3.data.amount, exp3.data.splitType);
        console.log('Splits:', exp3.data.splits);

        // 6. Fetch Expenses
        console.log(`\n6. Fetching Expenses...`);
        const fetchRes = await get(`${API_URL}/groups/${groupId}/expenses`, token1);
        console.log(`Fetched ${fetchRes.count} expenses.`);

        console.log('\nAll tests passed successfully!');

    } catch (error) {
        console.error('\nTest failed:', error.message);
    }
};

runTests();
