const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, authorize } = require('../middleware/auth');
const {
  addComment,
  deleteComment
} = require('../controllers/complaintController');

// All routes require authentication
router.use(protect);

// Add comment to complaint
router.post('/', addComment);

// Delete comment
router.delete('/:commentId', deleteComment);

module.exports = router;
