const express = require('express');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const {
    upsertBudget, getBudgets, updateBudget, deleteBudget,
    getCategoryAnalytics, getBudgetStatus
} = require('../controllers/budgetController');

// ─── Budget CRUD router (mounted at /:groupId/budgets) ────────────────────────
const budgetRouter = express.Router({ mergeParams: true });

budgetRouter.use(protect);

budgetRouter.route('/')
    .post(requireRole('Member'), upsertBudget)
    .get(requireRole('Viewer'), getBudgets);

budgetRouter.route('/:id')
    .put(requireRole('Member'), updateBudget)
    .delete(requireRole('Member'), deleteBudget);

// ─── Analytics router (mounted at /:groupId/analytics) ────────────────────────
const analyticsRouter = express.Router({ mergeParams: true });

analyticsRouter.use(protect);
analyticsRouter.use(requireRole('Viewer'));

// GET /:groupId/analytics              → spending per category
analyticsRouter.get('/', getCategoryAnalytics);

// GET /:groupId/analytics/budget-status → budget vs actual + exceeded flags
analyticsRouter.get('/budget-status', getBudgetStatus);

module.exports = { budgetRouter, analyticsRouter };
