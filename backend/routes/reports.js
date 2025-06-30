const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { sendReportNotification } = require('../services/emailService');

// @route   POST api/reports
// @desc    Create a new report
// @access  Public (temporarily disabled auth for testing)
router.post('/', async (req, res) => {
  try {
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

    const newReport = new Report({
      user: req.user?.id || 'anonymous',
      title,
      description,
      location: locObj,
      category,
      images,
      status: 'pending',
      userEmail: userEmail || 'no-email@example.com'
    });

    const report = await newReport.save();
    
    // Send email notification
    try {
      // Replace with actual admin email or get from environment variables
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@civicsense.com';
      await sendReportNotification(report, adminEmail);
      
      // If user provided email, send them a confirmation
      if (userEmail) {
        await sendReportNotification({
          ...report.toObject(),
          title: `[Confirmation] ${report.title}`
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
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/reports
// @desc    Get all reports
// @access  Public
router.get('/', async (req, res) => {
  try {
    const query = {};
    if (req.query.userId) {
      query.user = req.query.userId;
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
