const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :groupId
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { recurringExpenseValidation } = require('../middleware/validate');
const {
    createRecurringExpense,
    getRecurringExpenses,
    getRecurringExpenseById,
    updateRecurringExpense,
    deleteRecurringExpense,
    pauseRecurringExpense,
    resumeRecurringExpense
} = require('../controllers/recurringExpenseController');

// Base routes: /api/groups/:groupId/recurring
router.route('/')
    .post(protect, requireRole('Member'), recurringExpenseValidation, createRecurringExpense)
    .get(protect, requireRole('Viewer'), getRecurringExpenses);

// Single recurring expense routes
router.route('/:id')
    .get(protect, requireRole('Viewer'), getRecurringExpenseById)
    .put(protect, requireRole('Member'), updateRecurringExpense)
    .delete(protect, requireRole('Member'), deleteRecurringExpense);

// Pause / Resume actions
router.patch('/:id/pause', protect, requireRole('Member'), pauseRecurringExpense);
router.patch('/:id/resume', protect, requireRole('Member'), resumeRecurringExpense);

module.exports = router;
