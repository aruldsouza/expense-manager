const express = require('express');
const router = express.Router({ mergeParams: true });
const { getOptimizedSettlements, recordSettlement } = require('../controllers/settlementController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.get('/optimized', getOptimizedSettlements);
router.post('/', recordSettlement);

module.exports = router;
