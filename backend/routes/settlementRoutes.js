const express = require('express');
const router = express.Router({ mergeParams: true });
const {
    getOptimizedSettlements,
    recordSettlement,
    getDebtBetweenMembers,
    getGroupSettlements
} = require('../controllers/settlementController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.get('/optimized', getOptimizedSettlements);
router.get('/debt', getDebtBetweenMembers);
router.get('/', getGroupSettlements);
router.post('/', recordSettlement);

module.exports = router;


