const API_URL = 'http://localhost:5000/api';

const runTests = async () => {
    try {
        console.log('Testing Health Check...');
        const res = await fetch(`${API_URL}/health`);
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Body:', text);
    } catch (error) {
        console.error('Error:', error.message);
    }
};

runTests();
