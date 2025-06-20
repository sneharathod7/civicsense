const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('photo'), complaintController.createComplaint);

// Create a new complaint


// Get all complaints
router.get('/', complaintController.getComplaints);

// Get nearby complaints
router.get('/nearby', complaintController.getNearbyComplaints);

// Get single complaint
router.get('/:id', complaintController.getComplaint);

// Update complaint status
router.patch('/:id/status', complaintController.updateComplaintStatus);

// Upvote a complaint
router.post('/:id/upvote', complaintController.upvoteComplaint);

module.exports = router; 