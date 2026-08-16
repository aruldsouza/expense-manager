const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const errorHandler = require('./middleware/error');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/expense_manager';

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Smart Expense Splitter API',
    mongoConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const balanceRoutes = require('./routes/balanceRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/groups/:groupId/expenses', expenseRoutes);
app.use('/api/groups/:groupId/balances', balanceRoutes);
app.use('/api/groups/:groupId/settlements', settlementRoutes);
app.use('/api/groups/:groupId/transactions', transactionRoutes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// Error handling middleware
app.use(errorHandler);

// Connect to MongoDB & start server
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    app.listen(PORT, () => {
      console.log(`🚀 Smart Expense Splitter Backend listening on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.warn(`MongoDB connection error: ${err.message}`);
    console.log('Starting Express server in offline mode...');
    app.listen(PORT, () => {
      console.log(`🚀 Smart Expense Splitter Backend listening on http://localhost:${PORT} (Offline mode)`);
    });
  });
