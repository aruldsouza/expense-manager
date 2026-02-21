const express = require('express');
const router = express.Router({ mergeParams: true });
const { addExpense, getGroupExpenses, editExpense, getExpenseHistory, deleteExpense, deleteReceipt } = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { expenseValidation } = require('../middleware/validate');
const { uploadReceipt } = require('../middleware/upload');

router.route('/')
    // uploadReceipt runs first (parses multipart/form-data), then validation, then controller
    .post(protect, requireRole('Member'), uploadReceipt, expenseValidation, addExpense)
    .get(protect, requireRole('Viewer'), getGroupExpenses);

// Edit expense
router.put('/:id', protect, requireRole('Member'), uploadReceipt, expenseValidation, editExpense);

// Delete expense
router.delete('/:id', protect, requireRole('Member'), deleteExpense);

// Get expense history
router.get('/:id/history', protect, requireRole('Viewer'), getExpenseHistory);

// DELETE receipt from a specific expense
router.delete('/:id/receipt', protect, requireRole('Member'), deleteReceipt);

module.exports = router;
