const express = require('express');
const router = express.Router({ mergeParams: true });
const { getGroupBalances } = require('../controllers/settlementController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.get('/', getGroupBalances);

module.exports = router;
