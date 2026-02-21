const express = require('express');
const router = express.Router();
const { createGroup, getGroups, getGroupById, deleteGroup } = require('../controllers/groupController');
const { protect } = require('../middleware/auth');
const { groupValidation } = require('../middleware/validate');

const expenseRoutes = require('./expenseRoutes');
const balanceRoutes = require('./balanceRoutes');
const settlementRoutes = require('./settlementRoutes');
const transactionRoutes = require('./transactionRoutes');
const recurringExpenseRoutes = require('./recurringExpenseRoutes');

// Re-route into other resource routers
router.use('/:groupId/expenses', expenseRoutes);
router.use('/:groupId/balances', balanceRoutes);
router.use('/:groupId/settlements', settlementRoutes);
router.use('/:groupId/transactions', transactionRoutes);
router.use('/:groupId/recurring', recurringExpenseRoutes);

router.route('/')
    .post(protect, groupValidation, createGroup)
    .get(protect, getGroups);

router.route('/:id')
    .get(protect, getGroupById)
    .delete(protect, deleteGroup);

module.exports = router;
