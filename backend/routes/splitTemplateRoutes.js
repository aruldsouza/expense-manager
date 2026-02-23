const express = require('express');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const {
    getTemplates,
    createTemplate,
    updateTemplate,
    toggleFavorite,
    deleteTemplate
} = require('../controllers/splitTemplateController');

// Mounted at /:groupId/templates
const router = express.Router({ mergeParams: true });

router.use(protect);

// GET /api/groups/:groupId/templates
router.get('/', requireRole('Viewer'), getTemplates);

// POST /api/groups/:groupId/templates
router.post('/', requireRole('Member'), createTemplate);

// PUT /api/groups/:groupId/templates/:id
router.put('/:id', requireRole('Member'), updateTemplate);

// PATCH /api/groups/:groupId/templates/:id/favorite
router.patch('/:id/favorite', requireRole('Member'), toggleFavorite);

// DELETE /api/groups/:groupId/templates/:id
router.delete('/:id', requireRole('Member'), deleteTemplate);

module.exports = router;
