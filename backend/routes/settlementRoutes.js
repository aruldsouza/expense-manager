const express = require('express');
const router = express.Router({ mergeParams: true });
const { createSettlement, getOptimizedSettlements, getSettlements } = require('../controllers/settlementController');
const { protect } = require('../middleware/auth');
const { settlementValidation } = require('../middleware/validate');

router.route('/')
    .post(protect, settlementValidation, createSettlement)
    .get(protect, getSettlements);
router.get('/optimized', protect, getOptimizedSettlements);

module.exports = router;
