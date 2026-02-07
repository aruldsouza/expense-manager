const express = require('express');
const router = express.Router({ mergeParams: true });
const { createSettlement, getOptimizedSettlements } = require('../controllers/settlementController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createSettlement);
router.get('/optimized', protect, getOptimizedSettlements);

module.exports = router;
