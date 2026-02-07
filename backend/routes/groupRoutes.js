const express = require('express');
const router = express.Router();
const { createGroup, getGroups, getGroupById } = require('../controllers/groupController');
const { protect } = require('../middleware/auth');

const expenseRoutes = require('./expenseRoutes');
const balanceRoutes = require('./balanceRoutes');
const settlementRoutes = require('./settlementRoutes');

// Re-route into other resource routers
router.use('/:groupId/expenses', expenseRoutes);
router.use('/:groupId/balances', balanceRoutes);
router.use('/:groupId/settlements', settlementRoutes);

router.route('/')
    .post(protect, createGroup)
    .get(protect, getGroups);

router.route('/:id')
    .get(protect, getGroupById);

module.exports = router;
