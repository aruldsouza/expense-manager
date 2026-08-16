const express = require('express');
const router = express.Router({ mergeParams: true });
const { addExpense, getExpenses } = require('../controllers/expenseController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.post('/', addExpense);
router.get('/', getExpenses);

module.exports = router;
