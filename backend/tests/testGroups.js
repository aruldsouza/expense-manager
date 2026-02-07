const API_URL = 'http://localhost:5002/api';

const runTests = async () => {
    try {
        console.log('Testing Group APIs...');

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
                if (!res.ok) throw new Error(data.error || res.statusText);
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
                if (!res.ok) throw new Error(data.error || res.statusText);
                return data;
            } catch (e) {
                console.log('Failed to parse JSON:', text);
                throw new Error(`Server returned non-JSON response: ${res.status} ${res.statusText}`);
            }
        };

        // 1. Register a user
        const userEmail = `testuser${Date.now()}@example.com`;
        console.log(`\n1. Registering user: ${userEmail}`);
        const registerRes = await post(`${API_URL}/auth/register`, {
            name: 'Test User',
            email: userEmail,
            password: 'password123'
        });
        const token = registerRes.data.token;
        console.log('User registered successfully.');

        // 2. Create a group
        console.log('\n2. Creating a group...');
        const createGroupRes = await post(`${API_URL}/groups`, {
            name: 'My Test Group',
            description: 'This is a test group',
            type: 'Trip'
        }, token);
        const groupId = createGroupRes.data._id;
        console.log(`Group created successfully. ID: ${groupId}`);
        console.log('Group Data:', createGroupRes.data);

        // 3. Get all groups
        console.log('\n3. Fetching all groups...');
        const getGroupsRes = await get(`${API_URL}/groups`, token);
        console.log(`Fetched ${getGroupsRes.count} groups.`);

        // 4. Get group details
        console.log('\n4. Fetching group details...');
        const getGroupRes = await get(`${API_URL}/groups/${groupId}`, token);
        console.log('Group details fetched successfully.');
        console.log('Group Name:', getGroupRes.data.name);

        console.log('\nAll tests passed successfully!');

    } catch (error) {
        console.error('\nTest failed:', error.message);
    }
};

runTests();
