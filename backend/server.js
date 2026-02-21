require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/db');
const requestLogger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const { startScheduler } = require('./utils/scheduler');
const { initSocket } = require('./socket');

// Security Middleware Imports
const helmet = require('helmet');

// Initialize Express app
const app = express();
const httpServer = http.createServer(app);

// Connect to MongoDB
connectDB();

// Start recurring expense scheduler
startScheduler();

// CORS whitelist
const whitelist = [
    'http://localhost:5173',
    'https://aibased-expense-manager.vercel.app',
    process.env.CORS_ORIGIN
].filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (whitelist.includes(origin)) {
            callback(null, true);
        } else {
            console.log('Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use(helmet());

// Request logging
app.use(requestLogger);

// Initialize Socket.IO (must be after http server creation)
initSocket(httpServer, whitelist);

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/currency', require('./routes/currencyRoutes'));

app.get('/', (req, res) => res.send('API is running...'));

app.get('/api', (req, res) => res.json({
    success: true,
    message: 'Smart Expense Splitter API',
    version: '1.0.0',
}));

app.get('/api/health', (req, res) => res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'connected',
}));

// 404 handler
app.use((req, res) => res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
}));

// Centralized error handling (must be last)
app.use(errorHandler);

// Start server — use httpServer (not app.listen) so Socket.IO works
const PORT = process.env.PORT || 5001;

httpServer.listen(PORT, () => {
    console.log('');
    console.log('='.repeat(50));
    console.log('🚀 Smart Expense Splitter API Server');
    console.log('='.repeat(50));
    console.log(`📡 Server running on port: ${PORT}`);
    console.log(`🔌 Socket.IO: enabled`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`💚 Health Check: http://localhost:${PORT}/api/health`);
    console.log('='.repeat(50));
    console.log('');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
    process.exit(1);
});
