const express = require('express');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { createPaymentIntent } = require('../controllers/paymentController');

// Mounted at /:groupId/payments
const router = express.Router({ mergeParams: true });

router.use(protect);

// POST /api/groups/:groupId/payments/intent
router.post('/intent', requireRole('Member'), createPaymentIntent);

module.exports = router;
