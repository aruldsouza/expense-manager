const express = require('express');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { askAI } = require('../controllers/aiController');

// Mounted at /:groupId/ai
const router = express.Router({ mergeParams: true });

router.use(protect);
router.use(requireRole('Viewer'));

// POST /api/groups/:groupId/ai/chat
router.post('/chat', askAI);

module.exports = router;
