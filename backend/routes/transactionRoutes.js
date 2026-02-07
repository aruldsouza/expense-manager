const express = require('express');
const router = express.Router({ mergeParams: true });
const { getGroupTransactions } = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getGroupTransactions);

module.exports = router;
