const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :groupId
const { protect } = require('../middleware/auth');
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
    .post(protect, recurringExpenseValidation, createRecurringExpense)
    .get(protect, getRecurringExpenses);

// Single recurring expense routes
router.route('/:id')
    .get(protect, getRecurringExpenseById)
    .put(protect, updateRecurringExpense)
    .delete(protect, deleteRecurringExpense);

// Pause / Resume actions
router.patch('/:id/pause', protect, pauseRecurringExpense);
router.patch('/:id/resume', protect, resumeRecurringExpense);

module.exports = router;
