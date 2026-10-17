const PORT = process.env.PORT || 5001;
const API_URL = `http://localhost:${PORT}/api`;

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
