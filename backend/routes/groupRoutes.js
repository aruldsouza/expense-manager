const express = require('express');
const router = express.Router();
const { createGroup, getGroups, getGroupById } = require('../controllers/groupController');
const { protect } = require('../middleware/auth');

router.route('/')
    .post(protect, createGroup)
    .get(protect, getGroups);

router.route('/:id')
    .get(protect, getGroupById);

module.exports = router;
