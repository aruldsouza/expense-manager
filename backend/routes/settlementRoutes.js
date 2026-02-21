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
const { requireRole } = require('../middleware/rbac');
const { settlementValidation } = require('../middleware/validate');

// GET /debt?payer=X&payee=Y — must come before /:id to avoid conflict
router.get('/debt', protect, requireRole('Viewer'), getDebtBetween);
router.get('/optimized', protect, requireRole('Viewer'), getOptimizedSettlements);

router.route('/')
    .post(protect, requireRole('Member'), settlementValidation, createSettlement)
    .get(protect, requireRole('Viewer'), getSettlements);

router.delete('/:id', protect, requireRole('Member'), deleteSettlement);

module.exports = router;
