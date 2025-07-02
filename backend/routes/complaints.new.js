const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Complaint = require('../models/Complaint');
const { protect } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
});

// @desc    Create a new complaint
// @route   POST /api/v1/complaints
// @access  Private
router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    const { issueType, description, latitude, longitude, address } = req.body;
    
    // Validate required fields
    if (!issueType || !description || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: issueType, description, latitude, longitude'
      });
    }

    // Create complaint data
    const complaintData = {
      ticketId: `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      user: req.user.id,
      issueType,
      description,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
        address: address || ''
      },
      status: 'pending',
      upvotes: 0,
      upvotedBy: [],
      images: [],
      comments: []
    };

    // Add image path if uploaded
    if (req.file) {
      complaintData.images.push(`/uploads/${req.file.filename}`);
    }

    const complaint = await Complaint.create(complaintData);
    
    // Populate user data in response
    await complaint.populate('user', 'name email');
    
    res.status(201).json({
      success: true,
      data: complaint
    });

  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating complaint'
    });
  }
});

// @desc    Get all complaints
// @route   GET /api/v1/complaints
// @access  Public
router.get('/', async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints
    });
  } catch (error) {
    console.error('Error getting complaints:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting complaints'
    });
  }
});

// @desc    Get single complaint
// @route   GET /api/v1/complaints/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('user', 'name email')
      .populate('comments.user', 'name');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    res.status(200).json({
      success: true,
      data: complaint
    });
  } catch (error) {
    console.error('Error getting complaint:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error getting complaint'
    });
  }
});

// @desc    Update complaint status
// @route   PUT /api/v1/complaints/:id/status
// @access  Private/Admin
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'in_progress', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    res.status(200).json({
      success: true,
      data: complaint
    });
  } catch (error) {
    console.error('Error updating complaint status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating complaint status'
    });
  }
});

// @desc    Upvote a complaint
// @route   PUT /api/v1/complaints/:id/upvote
// @access  Private
router.put('/:id/upvote', protect, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Check if user already upvoted
    if (complaint.upvotedBy.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You have already upvoted this complaint'
      });
    }

    // Add user to upvotedBy and increment upvotes
    complaint.upvotedBy.push(req.user.id);
    complaint.upvotes += 1;
    
    await complaint.save();

    res.status(200).json({
      success: true,
      data: complaint
    });
  } catch (error) {
    console.error('Error upvoting complaint:', error);
    res.status(500).json({
      success: false,
      message: 'Error upvoting complaint'
    });
  }
});

// @desc    Add comment to complaint
// @route   POST /api/v1/complaints/:id/comments
// @access  Private
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Please add a comment text'
      });
    }

    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    const comment = {
      user: req.user.id,
      text
    };

    complaint.comments.unshift(comment);
    await complaint.save();

    // Populate user details in the response
    await complaint.populate('comments.user', 'name');
    const newComment = complaint.comments[0];

    res.status(201).json({
      success: true,
      data: newComment
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding comment'
    });
  }
});

module.exports = router;
