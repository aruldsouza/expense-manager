const express = require('express');
const { protect } = require('../middleware/auth');
const {
    upsertBudget, getBudgets, updateBudget, deleteBudget,
    getCategoryAnalytics, getBudgetStatus
} = require('../controllers/budgetController');

// ─── Budget CRUD router (mounted at /:groupId/budgets) ────────────────────────
const budgetRouter = express.Router({ mergeParams: true });

budgetRouter.use(protect);

budgetRouter.route('/')
    .post(upsertBudget)
    .get(getBudgets);

budgetRouter.route('/:id')
    .put(updateBudget)
    .delete(deleteBudget);

// ─── Analytics router (mounted at /:groupId/analytics) ────────────────────────
const analyticsRouter = express.Router({ mergeParams: true });

analyticsRouter.use(protect);

// GET /:groupId/analytics              → spending per category
analyticsRouter.get('/', getCategoryAnalytics);

// GET /:groupId/analytics/budget-status → budget vs actual + exceeded flags
analyticsRouter.get('/budget-status', getBudgetStatus);

module.exports = { budgetRouter, analyticsRouter };
