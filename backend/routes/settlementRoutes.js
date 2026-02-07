const express = require('express');
const router = express.Router({ mergeParams: true });
const { createSettlement, getOptimizedSettlements } = require('../controllers/settlementController');
const { protect } = require('../middleware/auth');
const { settlementValidation } = require('../middleware/validate');

router.post('/', protect, settlementValidation, createSettlement);
router.get('/optimized', protect, getOptimizedSettlements);

module.exports = router;
