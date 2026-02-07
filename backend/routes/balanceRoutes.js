const express = require('express');
const router = express.Router({ mergeParams: true });
const { getGroupBalances } = require('../controllers/balanceController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getGroupBalances);

module.exports = router;
