const API_URL = 'http://localhost:5002/api';

const runTests = async () => {
    try {
        console.log('Testing Settlement & Optimization APIs...');

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

        // 1. Register 3 users: Alice, Bob, Charlie
        const emailSuffix = Date.now();
        const u1 = await post(`${API_URL}/auth/register`, { name: 'Alice', email: `alice_${emailSuffix}@example.com`, password: 'password123' });
        const u2 = await post(`${API_URL}/auth/register`, { name: 'Bob', email: `bob_${emailSuffix}@example.com`, password: 'password123' });
        const u3 = await post(`${API_URL}/auth/register`, { name: 'Charlie', email: `charlie_${emailSuffix}@example.com`, password: 'password123' });

        const token1 = u1.data.token;
        const id1 = u1.data.user.id;
        const id2 = u2.data.user.id;
        const id3 = u3.data.user.id;
        console.log('Users registered.');

        // 2. Create Group
        console.log(`\n2. Creating Group...`);
        const groupRes = await post(`${API_URL}/groups`, {
            name: 'Settlement Test Group',
            members: [id2, id3]
        }, token1);
        const groupId = groupRes.data._id;
        console.log('Group created.');

        // 3. Alice pays 300, split equally (100 each)
        // Alice Net: +200, Bob Net: -100, Charlie Net: -100
        console.log(`\n3. Alice pays 300 (Equal Split)...`);
        await post(`${API_URL}/groups/${groupId}/expenses`, {
            description: 'Dinner',
            amount: 300,
            payer: id1,
            splitType: 'EQUAL'
        }, token1);

        // 4. Check Optimized Settlements
        console.log(`\n4. Checking Optimized Settlements...`);
        const optRes = await get(`${API_URL}/groups/${groupId}/settlements/optimized`, token1);
        console.log('Suggested Settlements:', optRes.data.length);
        optRes.data.forEach(s => console.log(`${s.from.name} -> ${s.to.name}: ${s.amount}`));

        // Expect: Bob -> Alice (100), Charlie -> Alice (100)

        // 5. Bob settles 100 with Alice
        console.log(`\n5. Bob pays Alice 100...`);
        await post(`${API_URL}/groups/${groupId}/settlements`, {
            payee: id1,
            amount: 100
        }, u2.data.token); // Bob performs action

        // 6. Check Balances
        // Alice: +200 - 100 (received) = +100 ??? 
        // Wait, logic check:
        // Alice Balance = +200 (owed to her). 
        // Settlement: Bob pays Alice. 
        // Bob's balance should go from -100 to 0.
        // Alice's balance should go from +200 to +100 (she is still owed 100).

        console.log(`\n6. Fetching Balances...`);
        const balRes = await get(`${API_URL}/groups/${groupId}/balances`, token1);
        const aliceBal = balRes.data.find(b => b.user._id === id1).balance;
        const bobBal = balRes.data.find(b => b.user._id === id2).balance;
        const charlieBal = balRes.data.find(b => b.user._id === id3).balance;

        console.log(`Alice: ${aliceBal}, Bob: ${bobBal}, Charlie: ${charlieBal}`);

        if (aliceBal === 100 && bobBal === 0 && charlieBal === -100) {
            console.log('SUCCESS: Balances updated correctly.');
        } else {
            console.log('FAILURE: Balances incorrect.');
        }

        // 7. Check Optimized Settlements again
        // Should only be Charlie -> Alice (100)
        console.log(`\n7. Checking Optimized Settlements (Post-Settle)...`);
        const optRes2 = await get(`${API_URL}/groups/${groupId}/settlements/optimized`, token1);
        console.log('Suggested Settlements:', optRes2.data.length);
        optRes2.data.forEach(s => console.log(`${s.from.name} -> ${s.to.name}: ${s.amount}`));

    } catch (error) {
        console.error('\nTest failed:', error.message);
    }
};

runTests();
