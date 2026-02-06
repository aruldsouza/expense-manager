/**
 * Authentication API Test Script
 * Run with: node testAuth.js
 */

const BASE_URL = 'http://localhost:3000/api/auth';

// Test data
const testUser = {
    name: 'Alice Johnson',
    email: `test${Date.now()}@example.com`, // Unique email
    password: 'password123',
};

let authToken = '';

/**
 * Helper function to make HTTP requests
 */
async function makeRequest(endpoint, method = 'GET', body = null, token = null) {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers,
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, options);
        const data = await response.json();
        return {
            status: response.status,
            data,
        };
    } catch (error) {
        return {
            status: 0,
            error: error.message,
        };
    }
}

/**
 * Test 1: User Registration
 */
async function testRegistration() {
    console.log('\n📝 Test 1: User Registration');
    console.log('=' + '='.repeat(50));
    console.log('POST /api/auth/register');
    console.log('Body:', JSON.stringify(testUser, null, 2));

    const result = await makeRequest('/register', 'POST', testUser);

    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));

    if (result.status === 201 && result.data.success) {
        console.log('✅ Registration successful!');
        authToken = result.data.data.token;
        return true;
    } else {
        console.log('❌ Registration failed!');
        return false;
    }
}

/**
 * Test 2: User Login
 */
async function testLogin() {
    console.log('\n🔐 Test 2: User Login');
    console.log('=' + '='.repeat(50));
    console.log('POST /api/auth/login');

    const loginData = {
        email: testUser.email,
        password: testUser.password,
    };

    console.log('Body:', JSON.stringify(loginData, null, 2));

    const result = await makeRequest('/login', 'POST', loginData);

    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));

    if (result.status === 200 && result.data.success) {
        console.log('✅ Login successful!');
        authToken = result.data.data.token;
        return true;
    } else {
        console.log('❌ Login failed!');
        return false;
    }
}

/**
 * Test 3: Get Current User (Protected Route)
 */
async function testGetCurrentUser() {
    console.log('\n👤 Test 3: Get Current User (Protected Route)');
    console.log('=' + '='.repeat(50));
    console.log('GET /api/auth/me');
    console.log('Token:', authToken.substring(0, 50) + '...');

    const result = await makeRequest('/me', 'GET', null, authToken);

    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));

    if (result.status === 200 && result.data.success) {
        console.log('✅ Protected route access successful!');
        return true;
    } else {
        console.log('❌ Protected route access failed!');
        return false;
    }
}

/**
 * Test 4: Access Protected Route Without Token
 */
async function testUnauthorizedAccess() {
    console.log('\n🚫 Test 4: Access Protected Route Without Token');
    console.log('=' + '='.repeat(50));
    console.log('GET /api/auth/me (no token)');

    const result = await makeRequest('/me', 'GET');

    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));

    if (result.status === 401) {
        console.log('✅ Unauthorized access properly blocked!');
        return true;
    } else {
        console.log('❌ Security issue: Unauthorized access not blocked!');
        return false;
    }
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('\n🧪 Authentication API Tests');
    console.log('=' + '='.repeat(50));
    console.log(`Testing against: ${BASE_URL}`);

    const results = {
        registration: false,
        login: false,
        getCurrentUser: false,
        unauthorized: false,
    };

    try {
        results.registration = await testRegistration();
        results.login = await testLogin();
        results.getCurrentUser = await testGetCurrentUser();
        results.unauthorized = await testUnauthorizedAccess();

        // Summary
        console.log('\n📊 Test Summary');
        console.log('=' + '='.repeat(50));
        console.log('Registration:', results.registration ? '✅ PASS' : '❌ FAIL');
        console.log('Login:', results.login ? '✅ PASS' : '❌ FAIL');
        console.log('Get Current User:', results.getCurrentUser ? '✅ PASS' : '❌ FAIL');
        console.log('Unauthorized Access Blocked:', results.unauthorized ? '✅ PASS' : '❌ FAIL');

        const passCount = Object.values(results).filter((r) => r).length;
        console.log(`\n${passCount}/4 tests passed`);

        if (passCount === 4) {
            console.log('\n🎉 All tests passed!');
        } else {
            console.log('\n⚠️ Some tests failed!');
        }
    } catch (error) {
        console.error('\n❌ Test execution error:', error.message);
        console.error('Make sure the server is running on port 3000');
    }
}

// Run tests
runTests();
