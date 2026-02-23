const express = require('express');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { generatePdfReport, sendMonthlyEmailReport } = require('../controllers/reportController');

// Mounted at /:groupId/reports
const router = express.Router({ mergeParams: true });

router.use(protect);

// GET /api/groups/:groupId/reports/pdf
// ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/pdf', requireRole('Viewer'), generatePdfReport);

// POST /api/groups/:groupId/reports/email
router.post('/email', requireRole('Admin'), sendMonthlyEmailReport);

module.exports = router;
