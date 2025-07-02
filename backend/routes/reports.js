const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { sendReportNotification } = require('../services/emailService');
const { protect } = require('../middleware/auth');

// @route   POST api/reports
// @desc    Create a new report
// @access  Private (requires authentication)
router.post('/', protect, async (req, res) => {
  try {
    console.log('Received POST /api/reports', req.body);
    console.log('req.user:', req.user);
    console.log('Authorization header:', req.headers.authorization);

    const { title, description, location, category, images, userEmail } = req.body;
    
    // Compute coordinates robustly
    const coords = Array.isArray(location?.coordinates) && location.coordinates.length === 2
      ? location.coordinates
      : (location?.lat !== undefined && location?.lng !== undefined)
        ? [location.lng, location.lat]
        : [0, 0];

    const locObj = {
      type: 'Point',
      coordinates: coords,
      address: location?.address || 'Unknown address'
    };

    // Prepare report data
    const reportData = {
      title,
      description,
      location: locObj,
      category,
      images,
      status: 'pending',
      userEmail: req.user?.email || userEmail || 'no-email@example.com',
      userMobile: req.user?.mobile || req.body.userMobile || 'no-mobile'
    };
    if (req.user?.id) {
      reportData.user = req.user.id; // Only set if authenticated
    }

    const newReport = new Report(reportData);

    console.log('Saving new report...');
    const report = await newReport.save();
    console.log('Report saved:', report);
    
    // Send email notification
    try {
      // Replace with actual admin email or get from environment variables
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@civicsense.com';
      await sendReportNotification(report, adminEmail);
      
      // If user provided email, send them a confirmation
      if (userEmail) {
        await sendReportNotification({
          ...report.toObject(),
          title: `[Confirmation] ${report.title}`,
          userMobile: req.user?.mobile || req.body.userMobile || 'no-mobile'
        }, userEmail);
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the request if email fails
    }
    
    res.status(201).json({
      success: true,
      data: report,
      message: 'Report submitted successfully!'
    });
  } catch (err) {
    console.error('Full error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET api/reports
// @desc    Get all reports
// @access  Public
router.get('/', async (req, res) => {
  try {
    const query = {};
    const { userId, userEmail } = req.query;
    if (userId && userEmail) {
      query.$or = [{ user: userId }, { userEmail }];
    } else if (userId) {
      query.user = userId;
    } else if (userEmail) {
      query.userEmail = userEmail;
    }
    const reports = await Report.find(query).sort({ date: -1 });
    res.json({ success: true, data: reports });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/reports/:id
// @desc    Get report by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ msg: 'Report not found' });
    }
    
    res.json(report);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Report not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
