const express = require('express');
const router = express.Router();
const { createGroup, getGroups, getGroupById, deleteGroup, updateGroup, updateRole, removeMember } = require('../controllers/groupController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { groupValidation } = require('../middleware/validate');

const expenseRoutes = require('./expenseRoutes');
const balanceRoutes = require('./balanceRoutes');
const settlementRoutes = require('./settlementRoutes');
const transactionRoutes = require('./transactionRoutes');
const recurringExpenseRoutes = require('./recurringExpenseRoutes');
const { budgetRouter, analyticsRouter } = require('./budgetRoutes');

// Re-route into other resource routers
router.use('/:groupId/expenses', expenseRoutes);
router.use('/:groupId/balances', balanceRoutes);
router.use('/:groupId/settlements', settlementRoutes);
router.use('/:groupId/transactions', transactionRoutes);
router.use('/:groupId/recurring', recurringExpenseRoutes);
router.use('/:groupId/budgets', budgetRouter);
router.use('/:groupId/analytics', analyticsRouter);

router.route('/')
    .post(protect, groupValidation, createGroup)
    .get(protect, getGroups);

// The get route uses req.params.id for legacy compatibility.
// We apply the RBAC middleware to paths with :groupId so it extracts the param correctly.
router.route('/:id')
    .get(protect, getGroupById)          // Internal check handles role
    .put(protect, (req, res, next) => {
        // map id to groupId for the middleware
        req.params.groupId = req.params.id;
        next();
    }, requireRole('Admin'), updateGroup)
    .delete(protect, (req, res, next) => {
        req.params.groupId = req.params.id;
        next();
    }, requireRole('Admin'), deleteGroup);

// Admin member management routes
router.patch('/:groupId/members/:userId/role', protect, requireRole('Admin'), updateRole);
router.delete('/:groupId/members/:userId', protect, requireRole('Admin'), removeMember);

module.exports = router;
