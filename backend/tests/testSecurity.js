const API_URL = 'http://localhost:5002/api';

const runTests = async () => {
    try {
        console.log('Testing Security & Validation...');

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
                return { status: res.status, data };
            } catch (e) {
                return { status: res.status, text };
            }
        };

        // 1. Test XSS in Registration
        console.log('\n1. Testing XSS in Name...');
        const xssRes = await post(`${API_URL}/auth/register`, {
            name: '<script>alert("XSS")</script>John',
            email: `security_${Date.now()}@example.com`,
            password: 'password123'
        });

        // Express validator should escape this or XSS clean should sanitize it
        // Or if validation fails because of characters
        console.log('Status:', xssRes.status);
        if (xssRes.status === 201) {
            console.log('Registered Name:', xssRes.data.data.user.name);
            if (xssRes.data.data.user.name.includes('<script>')) {
                console.log('FAILURE: XSS script not sanitized.');
            } else {
                console.log('SUCCESS: Input sanitized.');
            }
        } else {
            console.log('Response:', xssRes.data);
        }

        // 2. Test Invalid Email
        console.log('\n2. Testing Invalid Email...');
        const emailRes = await post(`${API_URL}/auth/register`, {
            name: 'Bad Email',
            email: 'not-an-email',
            password: 'password123'
        });
        if (emailRes.status === 400 && emailRes.data.errors) {
            console.log('SUCCESS: Invalid email rejected.');
            console.log('Error:', emailRes.data.errors[0].message);
        } else {
            console.log('FAILURE: Invalid email accepted or other error.', emailRes.status);
        }

        // 3. Test Short Password
        console.log('\n3. Testing Weak Password...');
        const passRes = await post(`${API_URL}/auth/register`, {
            name: 'Weak Pass',
            email: `weak_${Date.now()}@example.com`,
            password: '123'
        });
        if (passRes.status === 400 && passRes.data.errors) {
            console.log('SUCCESS: Weak password rejected.');
            console.log('Error:', passRes.data.errors[0].message);
        } else {
            console.log('FAILURE: Weak password accepted or other error.', passRes.status);
        }

        // 4. Test User (for Auth checks)
        const u1 = await post(`${API_URL}/auth/register`, { name: 'Valid User', email: `valid_${Date.now()}@example.com`, password: 'password123' });
        const token = u1.data.token;

        // 5. Test Invalid Expense Amount
        console.log('\n5. Testing Invalid Expense Amount...');
        // Create group first
        const groupRes = await post(`${API_URL}/groups`, { name: 'Sec Group' }, token);
        const groupId = groupRes.data.data._id; // Note: structure data.data for created group

        const expRes = await post(`${API_URL}/groups/${groupId}/expenses`, {
            description: 'Negative',
            amount: -100,
            payer: u1.data.data.user.id,
            splitType: 'EQUAL'
        }, token);

        if (expRes.status === 400 && expRes.data.errors) {
            console.log('SUCCESS: Invalid amount rejected.');
            console.log('Error:', expRes.data.errors[0].message);
        } else {
            console.log('FAILURE: Invalid amount accepted.', expRes.status);
        }

    } catch (error) {
        console.error('\nTest failed:', error.message);
    }
};

runTests();
