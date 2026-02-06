require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const requestLogger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
// CORS configuration - allow frontend to make requests
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173', // Vite default port
    credentials: true,
}));

// Body parsing middleware
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Request logging middleware
app.use(requestLogger);

// API Routes
// Auth routes
app.use('/api/auth', require('./routes/authRoutes'));
// Group routes
app.use('/api/groups', require('./routes/groupRoutes'));

// API Routes
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Smart Expense Splitter API',
        version: '1.0.0',
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
    });
});

// 404 handler for undefined routes
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`,
    });
});

// Centralized error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log('');
    console.log('='.repeat(50));
    console.log('🚀 Smart Expense Splitter API Server');
    console.log('='.repeat(50));
    console.log(`📡 Server running on port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`💚 Health Check: http://localhost:${PORT}/api/health`);
    console.log('='.repeat(50));
    console.log('');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
    // Close server & exit process
    process.exit(1);
});
