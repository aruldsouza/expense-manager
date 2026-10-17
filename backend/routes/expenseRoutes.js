const express = require('express');
const router = express.Router({ mergeParams: true });
const { addExpense, getExpenses } = require('../controllers/expenseController');
const { authMiddleware } = require('../middleware/auth');
const { expenseValidation } = require('../middleware/validate');

router.use(authMiddleware);
router.post('/', expenseValidation, addExpense);
router.get('/', getExpenses);

module.exports = router;
