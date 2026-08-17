const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const errorHandler = require('./middleware/error');
const { initSocket } = require('./socket');

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/expense_manager';

// Initialize Socket.IO
initSocket(server, '*');

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

// Database connectivity middleware
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
    return res.status(503).json({
      error: 'Database connection unavailable. Please check MONGODB_URI environment variable in Render dashboard.'
    });
  }
  next();
});


// Import Routes
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const balanceRoutes = require('./routes/balanceRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const currencyRoutes = require('./routes/currencyRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const aiRoutes = require('./routes/aiRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const recurringExpenseRoutes = require('./routes/recurringExpenseRoutes');
const reportRoutes = require('./routes/reportRoutes');
const splitTemplateRoutes = require('./routes/splitTemplateRoutes');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/groups/:groupId/expenses', expenseRoutes);
app.use('/api/groups/:groupId/balances', balanceRoutes);
app.use('/api/groups/:groupId/settlements', settlementRoutes);
app.use('/api/groups/:groupId/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/currencies', currencyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/groups/:groupId/ai', aiRoutes);
app.use('/api/groups/:groupId/analytics', analyticsRoutes);
app.use('/api/groups/:groupId/budgets', budgetRoutes);
app.use('/api/groups/:groupId/payments', paymentRoutes);
app.use('/api/groups/:groupId/recurring', recurringExpenseRoutes);
app.use('/api/groups/:groupId/reports', reportRoutes);
app.use('/api/groups/:groupId/templates', splitTemplateRoutes);

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
    server.listen(PORT, () => {
      console.log(`🚀 Smart Expense Splitter Backend listening on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.warn(`MongoDB connection error: ${err.message}`);
    console.log('Starting Express server in offline mode...');
    server.listen(PORT, () => {
      console.log(`🚀 Smart Expense Splitter Backend listening on http://localhost:${PORT} (Offline mode)`);
    });
  });

