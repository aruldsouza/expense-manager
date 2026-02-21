const express = require('express');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const {
    getCategoryAnalytics,
    getMonthlyTrends,
    getUserStats,
    exportExpensesCsv
} = require('../controllers/analyticsController');

// Mounted at /:groupId/analytics
const router = express.Router({ mergeParams: true });

router.use(protect);
router.use(requireRole('Viewer'));

// GET /api/groups/:groupId/analytics/category
router.get('/category', getCategoryAnalytics);

// GET /api/groups/:groupId/analytics/trends
router.get('/trends', getMonthlyTrends);

// GET /api/groups/:groupId/analytics/users
router.get('/users', getUserStats);

// GET /api/groups/:groupId/analytics/export
router.get('/export', exportExpensesCsv);

module.exports = router;
