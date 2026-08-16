const express = require('express');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const {
    upsertBudget, getBudgets, updateBudget, deleteBudget,
    getBudgetStatus
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

// ─── Budget Status ────────────────────────
// GET /:groupId/budgets/status → budget vs actual + exceeded flags
// Mounted directly on budget router since it relates heavily to budgets
budgetRouter.get('/status', requireRole('Viewer'), getBudgetStatus);

module.exports = budgetRouter;
