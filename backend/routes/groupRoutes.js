const express = require('express');
const router = express.Router();
const { createGroup, getUserGroups, getGroupById, addMember } = require('../controllers/groupController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.post('/', createGroup);
router.get('/', getUserGroups);
router.get('/:groupId', getGroupById);
router.post('/:groupId/members', addMember);

module.exports = router;
