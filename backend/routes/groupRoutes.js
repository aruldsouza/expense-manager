const express = require('express');
const router = express.Router();
const { createGroup, getUserGroups, getGroupById, addMember, removeMember, deleteGroup } = require('../controllers/groupController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.post('/', createGroup);
router.get('/', getUserGroups);
router.get('/:groupId', getGroupById);
router.delete('/:groupId', deleteGroup);
router.post('/:groupId/members', addMember);
router.delete('/:groupId/members/:memberId', removeMember);

module.exports = router;

