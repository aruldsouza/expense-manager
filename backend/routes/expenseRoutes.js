const express = require('express');
const router = express.Router({ mergeParams: true });
const { addExpense, getGroupExpenses } = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');
const { expenseValidation } = require('../middleware/validate');

router.route('/')
    .post(protect, expenseValidation, addExpense)
    .get(protect, getGroupExpenses);

module.exports = router;
