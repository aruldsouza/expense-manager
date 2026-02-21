const express = require('express');
const router = express.Router({ mergeParams: true });
const {
    createSettlement,
    getOptimizedSettlements,
    getSettlements,
    getDebtBetween,
    deleteSettlement
} = require('../controllers/settlementController');
const { protect } = require('../middleware/auth');
const { settlementValidation } = require('../middleware/validate');

// GET /debt?payer=X&payee=Y — must come before /:id to avoid conflict
router.get('/debt', protect, getDebtBetween);
router.get('/optimized', protect, getOptimizedSettlements);

router.route('/')
    .post(protect, settlementValidation, createSettlement)
    .get(protect, getSettlements);

router.delete('/:id', protect, deleteSettlement);

module.exports = router;
