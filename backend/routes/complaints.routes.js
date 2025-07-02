const express = require('express');
const router = express.Router();
const {
  getComplaints,
  getComplaint,
  createComplaint,
  updateComplaint,
  deleteComplaint,
  complaintPhotoUpload,
  upvoteComplaint,
  addComment,
  deleteComment,
  getComplaintsInRadius
} = require('../controllers/complaintController');

// Import middleware
const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');
const Complaint = require('../models/Complaint');

// Include other resource routers
const commentRouter = require('./comments');

// Re-route into other resource routers
router.use('/:complaintId/comments', commentRouter);

// Public routes
router
  .route('/radius/:zipcode/:distance')
  .get(getComplaintsInRadius);

// Protected routes (require authentication)
router.use(protect);

// Routes for complaints
router
  .route('/')
  .get(
    advancedResults(Complaint, {
      path: 'user',
      select: 'firstName lastName'
    }),
    getComplaints
  )
  .post(createComplaint);

router
  .route('/:id')
  .get(getComplaint)
  .put(updateComplaint)
  .delete(deleteComplaint);

// Photo upload
router
  .route('/:id/photo')
  .put(complaintPhotoUpload);

// Upvote
router
  .route('/:id/upvote')
  .put(upvoteComplaint);

// Admin routes
router.use(authorize('Admin', 'MunicipalOfficial'));

// Admin-only routes can be added here

module.exports = router;
