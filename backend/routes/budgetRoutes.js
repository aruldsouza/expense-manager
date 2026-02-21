const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :groupId
const protect = require('../middleware/auth');
const {
    upsertBudget, getBudgets, updateBudget, deleteBudget,
    getCategoryAnalytics, getBudgetStatus
} = require('../controllers/budgetController');

// All routes protected
router.use(protect);

// Budget CRUD
router.route('/')
    .post(upsertBudget)
    .get(getBudgets);

router.route('/:id')
    .put(updateBudget)
    .delete(deleteBudget);

// Analytics (mounted separately at /analytics under groupRoutes)
router.get('/analytics', getCategoryAnalytics);
router.get('/analytics/budget-status', getBudgetStatus);

module.exports = router;
