const express = require('express');
const router = express.Router({ mergeParams: true });
const { addExpense, getGroupExpenses } = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');

router.route('/')
    .post(protect, addExpense)
    .get(protect, getGroupExpenses);

module.exports = router;
