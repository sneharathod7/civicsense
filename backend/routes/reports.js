const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { sendReportNotification } = require('../services/emailService');
const { protect } = require('../middleware/auth');

// @route   POST api/reports
// @desc    Create a new report
// @access  Private (requires authentication)
// Configure multer for file uploads
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Handle multiple file uploads
const uploadMiddleware = upload.array('photos');

router.post('/', protect, (req, res, next) => {
  // First handle file uploads
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
    
    try {
      console.log('Received POST /api/reports');
      console.log('req.user:', req.user);
      console.log('req.body:', req.body);
      console.log('Uploaded files:', req.files);

      // Parse the JSON data from the form
      const { title, description, location, category, images, userEmail } = req.body;
      let parsedLocation = {};
      let parsedImages = [];
      
      // Parse location if it's a string
      if (typeof location === 'string') {
        try {
          parsedLocation = JSON.parse(location);
        } catch (e) {
          console.error('Error parsing location:', e);
          parsedLocation = {};
        }
      } else {
        parsedLocation = location || {};
      }
      
      // Parse images (may be a JSON string array of base64 strings)
      console.log('Raw images from request:', typeof images, images);
      if (images) {
        try {
          const parsed = JSON.parse(images);
          // Convert any plain base64 strings into objects with url property
          parsedImages = parsed.map((img) => {
            if (typeof img === 'string') {
              return { url: img };
            }
            return img;
          });
          console.log('Successfully parsed images:', parsedImages.length);
        } catch (e) {
          console.error('Error parsing images JSON:', e);
          parsedImages = [];
        }
      }
      
      // Log uploaded files
      console.log('Uploaded files:', req.files ? req.files.length : 0);
      
      // Add any uploaded files to the images array
      if (req.files && req.files.length > 0) {
        console.log('Processing uploaded files...');
        const fileImages = req.files.map((file, index) => {
          const imgData = {
            url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            filename: file.originalname,
            mimetype: file.mimetype,
            size: file.size
          };
          console.log(`File ${index + 1}:`, {
            name: file.originalname,
            size: file.size,
            type: file.mimetype,
            urlPreview: imgData.url.substring(0, 50) + '...'
          });
          return imgData;
        });
        
        parsedImages = [...parsedImages, ...fileImages];
      }
      
      // Build a photos array containing only string URLs (for backward compatibility)
      const photosArray = parsedImages.map(img => typeof img === 'string' ? img : img.url).filter(Boolean);
      
      console.log('Final images to save:', parsedImages.length);
      if (parsedImages.length > 0) {
        console.log('First image preview:', {
          url: parsedImages[0].url ? parsedImages[0].url.substring(0, 50) + '...' : 'No URL',
          type: parsedImages[0].mimetype || 'unknown'
        });
      }
    
      // Compute coordinates robustly
      const coords = Array.isArray(parsedLocation?.coordinates) && parsedLocation.coordinates.length === 2
        ? parsedLocation.coordinates
        : (parsedLocation?.lat !== undefined && parsedLocation?.lng !== undefined)
          ? [parsedLocation.lng, parsedLocation.lat]
          : [0, 0];

      const locObj = {
        type: 'Point',
        coordinates: coords,
        address: parsedLocation?.address || 'Unknown address'
      };

      // Prepare report data
      const reportData = {
        title,
        description,
        location: locObj,
        category,
        images: parsedImages, // detailed objects
        photos: photosArray,  // simple string URLs for legacy UI
        status: 'pending',
        userEmail: req.user?.email || userEmail || 'no-email@example.com',
        userMobile: req.user?.mobile || req.body.userMobile || 'no-mobile',
        createdAt: new Date()
      };
      
      if (req.user?.id) {
        reportData.user = req.user.id; // Only set if authenticated
      }

      console.log('Saving new report with data:', reportData);
      const newReport = new Report(reportData);
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
      
      return res.status(201).json({
        success: true,
        data: report,
        message: 'Report submitted successfully!'
      });
    } catch (err) {
      console.error('Error saving report:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }); // End of upload middleware
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
