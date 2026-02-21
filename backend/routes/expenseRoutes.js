const express = require('express');
const router = express.Router({ mergeParams: true });
const { addExpense, getGroupExpenses, deleteReceipt } = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { expenseValidation } = require('../middleware/validate');
const { uploadReceipt } = require('../middleware/upload');

router.route('/')
    // uploadReceipt runs first (parses multipart/form-data), then validation, then controller
    .post(protect, requireRole('Member'), uploadReceipt, expenseValidation, addExpense)
    .get(protect, requireRole('Viewer'), getGroupExpenses);

// DELETE receipt from a specific expense
router.delete('/:id/receipt', protect, requireRole('Member'), deleteReceipt);

module.exports = router;
