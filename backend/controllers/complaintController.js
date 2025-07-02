const path = require('path');
const fs = require('fs');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { predictDepartment } = require('../utils/mlClassifier');
const { sendEmail } = require('../utils/emailSender');

// Helper function to update achievement points
async function updateAchievementPoints(userId, points, reason) {
  let achievement = await Achievement.findOne({ user: userId });
  
  if (!achievement) {
    achievement = await Achievement.create({
      user: userId,
      points: 0,
      stats: {
        totalReports: 0,
        resolvedReports: 0,
        upvotesReceived: 0,
        commentsPosted: 0
      }
    });
  }

  achievement.points += points;
  achievement.pointsHistory.push({
    points,
    reason,
    type: 'earned',
    timestamp: Date.now()
  });

  await achievement.save();
  return achievement;
}

// @desc    Get all complaints
// @route   GET /api/v1/complaints
// @access  Public
exports.getComplaints = asyncHandler(async (req, res, next) => {
  // Debug: Log the current user ID
  console.log('Current user ID:', req.user ? req.user.id : 'No user');

  // Debug: Log all complaints for the current user
  const userComplaints = await Complaint.find({ user: req.user.id });
  console.log('Found complaints for user:', {
    count: userComplaints.length,
    complaints: userComplaints.map(c => ({
      id: c._id,
      status: c.status,
      createdAt: c.createdAt
    }))
  });

  res.status(200).json({
    success: true,
    data: res.advancedResults.data
  });
});

// @desc    Get single complaint
// @route   GET /api/v1/complaints/:id
// @access  Public
exports.getComplaint = asyncHandler(async (req, res, next) => {
  const complaint = await Complaint.findById(req.params.id).populate({
    path: 'user',
    select: 'firstName lastName email'
  });

  if (!complaint) {
    return next(
      new ErrorResponse(`Complaint not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: complaint
  });
});

// @desc    Create new complaint
// @route   POST /api/v1/complaints
// @access  Private
exports.createComplaint = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.user = req.user.id;

  // Check for published complaint
  const publishedComplaint = await Complaint.findOne({ user: req.user.id });

  // If the user is not an admin, they can only add one complaint
  if (publishedComplaint && req.user.role !== 'Admin') {
    return next(
      new ErrorResponse(
        `The user with ID ${req.user.id} has already submitted a complaint`,
        400
      )
    );
  }

  // Handle file upload
  if (!req.files) {
    return next(new ErrorResponse(`Please upload a file`, 400));
  }

  const file = req.files.file;

  // Make sure the image is a photo
  if (!file.mimetype.startsWith('image')) {
    return next(new ErrorResponse(`Please upload an image file`, 400));
  }

  // Check filesize
  const maxSize = process.env.MAX_FILE_UPLOAD || 1000000;
  if (file.size > maxSize) {
    return next(
      new ErrorResponse(
        `Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`,
        400
      )
    );
  }

  // Create custom filename
  file.name = `photo_${Date.now()}${path.parse(file.name).ext}`;

  file.mv(
    `${process.env.FILE_UPLOAD_PATH}/complaints/${file.name}`,
    async (err) => {
      if (err) {
        console.error(err);
        return next(new ErrorResponse(`Problem with file upload`, 500));
      }

      // Predict department using ML model
      const department = await predictDepartment(
        `/uploads/complaints/${file.name}`,
        req.body.issueType,
        { 
          latitude: req.body.latitude, 
          longitude: req.body.longitude 
        }
      );

      // Create complaint
      const complaint = await Complaint.create({
        ...req.body,
        images: [`/uploads/complaints/${file.name}`],
        department,
        status: 'pending'
      });

      // Award points for creating a new report
      await updateAchievementPoints(req.user.id, 10, 'New report submitted');

      res.status(201).json({
        success: true,
        data: complaint
      });
    }
  );
});

// @desc    Update complaint
// @route   PUT /api/v1/complaints/:id
// @access  Private
exports.updateComplaint = asyncHandler(async (req, res, next) => {
  let complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    return next(
      new ErrorResponse(`Complaint not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is complaint owner or admin
  if (complaint.user.toString() !== req.user.id && req.user.role !== 'Admin') {
    return next(
      new ErrorResponse(
        `User ${req.params.id} is not authorized to update this complaint`,
        401
      )
    );
  }

  // Check if the complaint is being marked as resolved
  const isBeingResolved = req.body.status === 'resolved' && complaint.status !== 'resolved';

  complaint = await Complaint.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  // Award points if the complaint is being resolved
  if (isBeingResolved) {
    await updateAchievementPoints(complaint.user.toString(), 50, 'Report resolved');
  }

  res.status(200).json({ success: true, data: complaint });
});

// @desc    Delete complaint
// @route   DELETE /api/v1/complaints/:id
// @access  Private
exports.deleteComplaint = asyncHandler(async (req, res, next) => {
  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    return next(
      new ErrorResponse(`Complaint not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is complaint owner or admin
  if (complaint.user.toString() !== req.user.id && req.user.role !== 'Admin') {
    return next(
      new ErrorResponse(
        `User ${req.params.id} is not authorized to delete this complaint`,
        401
      )
    );
  }

  // Delete image file
  if (complaint.images && complaint.images.length > 0) {
    complaint.images.forEach(image => {
      const filePath = path.join(__dirname, `../public${image}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  }

  await complaint.remove();

  res.status(200).json({ success: true, data: {} });
});

// @desc    Upload photo for complaint
// @route   PUT /api/v1/complaints/:id/photo
// @access  Private
exports.complaintPhotoUpload = asyncHandler(async (req, res, next) => {
  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    return next(
      new ErrorResponse(`Complaint not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is complaint owner or admin
  if (complaint.user.toString() !== req.user.id && req.user.role !== 'Admin') {
    return next(
      new ErrorResponse(
        `User ${req.params.id} is not authorized to update this complaint`,
        401
      )
    );
  }

  if (!req.files) {
    return next(new ErrorResponse(`Please upload a file`, 400));
  }

  const file = req.files.file;

  // Make sure the image is a photo
  if (!file.mimetype.startsWith('image')) {
    return next(new ErrorResponse(`Please upload an image file`, 400));
  }

  // Check filesize
  const maxSize = process.env.MAX_FILE_UPLOAD || 1000000;
  if (file.size > maxSize) {
    return next(
      new ErrorResponse(
        `Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`,
        400
      )
    );
  }

  // Create custom filename
  file.name = `photo_${complaint._id}${path.parse(file.name).ext}`;

  file.mv(
    `${process.env.FILE_UPLOAD_PATH}/complaints/${file.name}`,
    async (err) => {
      if (err) {
        console.error(err);
        return next(new ErrorResponse(`Problem with file upload`, 500));
      }

      // Add image to complaint
      await Complaint.findByIdAndUpdate(req.params.id, {
        $push: { images: `/uploads/complaints/${file.name}` }
      });

      res.status(200).json({
        success: true,
        data: file.name
      });
    }
  );
});

// @desc    Upvote a complaint
// @route   PUT /api/v1/complaints/:id/upvote
// @access  Private
exports.upvoteComplaint = asyncHandler(async (req, res, next) => {
  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    return next(
      new ErrorResponse(`Complaint not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if already upvoted
  if (
    complaint.upvotes.some(
      (upvote) => upvote.user.toString() === req.user.id
    )
  ) {
    return next(new ErrorResponse('Complaint already upvoted', 400));
  }

  // Add user to upvotes array
  complaint.upvotes.unshift({ user: req.user.id });
  await complaint.save();

  // If user is the owner of the complaint, don't notify
  if (complaint.user.toString() === req.user.id) {
    return res.status(200).json({
      success: true,
      data: complaint.upvotes
    });
  }

  // Notify complaint owner about the upvote
  const user = await User.findById(complaint.user);
  
  if (user) {
    const message = `Your complaint about ${complaint.issueType} has received an upvote!`;
    
    try {
      await sendEmail({
        email: user.email,
        subject: 'Your complaint received an upvote',
        message
      });
    } catch (err) {
      console.error('Error sending upvote notification email:', err);
    }
  }

  res.status(200).json({
    success: true,
    data: complaint.upvotes
  });
});

// @desc    Comment on a complaint
// @route   POST /api/v1/complaints/:id/comments
// @access  Private
exports.addComment = asyncHandler(async (req, res, next) => {
  const complaint = await Complaint.findById(req.params.id);
  const user = await User.findById(req.user.id).select('-password');

  if (!complaint) {
    return next(
      new ErrorResponse(`Complaint not found with id of ${req.params.id}`, 404)
    );
  }

  const newComment = {
    text: req.body.text,
    user: req.user.id,
    name: user.firstName + ' ' + user.lastName,
    avatar: user.avatar
  };

  complaint.comments.unshift(newComment);
  await complaint.save();

  // Notify complaint owner about the new comment
  if (complaint.user.toString() !== req.user.id) {
    const complaintOwner = await User.findById(complaint.user);
    
    if (complaintOwner) {
      const message = `Your complaint about ${complaint.issueType} has a new comment!`;
      
      try {
        await sendEmail({
          email: complaintOwner.email,
          subject: 'New comment on your complaint',
          message
        });
      } catch (err) {
        console.error('Error sending comment notification email:', err);
      }
    }
  }

  res.status(200).json(complaint.comments);
});

// @desc    Delete comment
// @route   DELETE /api/v1/complaints/:id/comments/:comment_id
// @access  Private
exports.deleteComment = asyncHandler(async (req, res, next) => {
  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    return next(
      new ErrorResponse(`Complaint not found with id of ${req.params.id}`, 404)
    );
  }

  // Pull out comment
  const comment = complaint.comments.find(
    (comment) => comment.id === req.params.comment_id
  );

  // Make sure comment exists
  if (!comment) {
    return next(
      new ErrorResponse(`Comment not found with id of ${req.params.comment_id}`, 404)
    );
  }

  // Check user is comment owner or admin
  if (
    comment.user.toString() !== req.user.id &&
    req.user.role !== 'Admin' &&
    complaint.user.toString() !== req.user.id
  ) {
    return next(
      new ErrorResponse(
        'User not authorized to delete this comment',
        401
      )
    );
  }

  // Get remove index
  const removeIndex = complaint.comments
    .map((comment) => comment.id)
    .indexOf(req.params.comment_id);

  complaint.comments.splice(removeIndex, 1);

  await complaint.save();

  res.status(200).json(complaint.comments);
});

// @desc    Get complaints within a radius
// @route   GET /api/v1/complaints/radius/:zipcode/:distance
// @access  Private
exports.getComplaintsInRadius = asyncHandler(async (req, res, next) => {
  const { zipcode, distance } = req.params;

  // Get lat/lng from geocoder
  const loc = await geocoder.geocode(zipcode);
  const lat = loc[0].latitude;
  const lng = loc[0].longitude;

  // Calc radius using radians
  // Divide dist by radius of Earth
  // Earth Radius = 3,963 mi / 6,378 km
  const radius = distance / 3963;

  const complaints = await Complaint.find({
    location: {
      $geoWithin: { $centerSphere: [[lng, lat], radius] }
    }
  });

  res.status(200).json({
    success: true,
    count: complaints.length,
    data: complaints
  });
});

// Helper to generate ticket ID
async function generateTicketId() {
    const count = await Complaint.countDocuments();
    return `CS${Date.now().toString().slice(-6)}${count + 1}`;
}

// Create a new complaint
exports.createComplaint = async (req, res) => {
    console.log('Received complaint submission:', req.body);
    try {
        const { userId, issueType, description, latitude, longitude, address } = req.body;
        
        // Validate required fields
        if (!userId || !issueType || !description || !latitude || !longitude || !address) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Process image if uploaded
        const images = [];
        if (req.file) {
            // In production, upload to cloud storage (e.g., AWS S3, Cloudinary)
            const imageUrl = `/uploads/${req.file.filename}`;
            images.push(imageUrl);
        }

        // Predict department using ML model
        const department = await predictDepartment(images[0], issueType, { latitude, longitude });

        // Create complaint
        const complaint = new Complaint({
            user: userId,
            issueType,
            description,
            location: {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)],
                address
            },
            department,
            images,
            status: 'pending'
        });

        await complaint.save();
        
        // Populate user details for notification
        const complaintWithUser = await complaint.populate('user', 'firstName lastName email mobile');
        
        // Send notifications (handle failures gracefully)
        try {
            await sendEmail(complaintWithUser);
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
        }
        
        try {
            await sendWhatsApp(complaintWithUser);
        } catch (whatsappError) {
            console.error('WhatsApp sending failed:', whatsappError);
        }

        res.status(201).json({
            success: true,
            data: complaint
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get all complaints
exports.getComplaints = async (req, res) => {
    console.log('getComplaints: Received request');
    try {
        console.log('getComplaints: About to query database');
        
        // Build query
        const query = {};
        if (req.query.userId) {
            query.user = req.query.userId;
        }
        if (req.query.status) {
            query.status = req.query.status;
        }
        if (req.query.department) {
            query.department = req.query.department;
        }

        // Execute query with pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [complaints, total] = await Promise.all([
            Complaint.find(query)
                .populate('user', 'firstName lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Complaint.countDocuments(query)
        ]);

        console.log('getComplaints: Database query successful, complaints count:', complaints.length);
        
        res.status(200).json({
            success: true,
            count: complaints.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: complaints
        });
    } catch (error) {
        console.error('getComplaints: Error occurred:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get single complaint
exports.getComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id)
            .populate('user', 'firstName lastName email mobile')
            .populate('upvotedBy', 'firstName lastName');

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
        res.status(500).json({
            success: false,
            error: 'Server error while fetching complaint'
        });
    }
};

// Update complaint status
exports.updateComplaintStatus = async (req, res) => {
    try {
        const { status, resolutionNotes, expectedResolutionDate } = req.body;
        
        // Validate status
        const validStatuses = ['pending', 'in_progress', 'resolved', 'rejected'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
            });
        }

        const updateData = {};
        if (status) updateData.status = status;
        if (resolutionNotes) updateData.resolutionNotes = resolutionNotes;
        if (expectedResolutionDate) updateData.expectedResolutionDate = expectedResolutionDate;

        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            updateData,
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
            error: 'Server error while updating complaint status'
        });
    }
};

// Upvote a complaint
const upvoteComplaint = async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required to upvote'
            });
        }

        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        // Check if user already upvoted
        const alreadyUpvoted = complaint.upvotedBy.some(id => id.toString() === userId);
        
        if (alreadyUpvoted) {
            // Remove upvote
            await Complaint.findByIdAndUpdate(
                req.params.id,
                {
                    $pull: { upvotedBy: userId },
                    $inc: { upvotes: -1 }
                }
            );
        } else {
            // Add upvote
            await Complaint.findByIdAndUpdate(
                req.params.id,
                {
                    $addToSet: { upvotedBy: userId },
                    $inc: { upvotes: 1 }
                },
                { new: true }
            );
        }

        const updatedComplaint = await Complaint.findById(req.params.id);
        
        res.status(200).json({
            success: true,
            upvoted: !alreadyUpvoted,
            upvotes: updatedComplaint.upvotes
        });
    } catch (error) {
        console.error('Error upvoting complaint:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while upvoting complaint'
        });
    }
};

// Get nearby complaints
const getNearbyComplaints = async (req, res) => {
    try {
        const { longitude, latitude, maxDistance = 5000 } = req.query; // Default 5km in meters
        
        if (!longitude || !latitude) {
            return res.status(400).json({
                success: false,
                message: 'Longitude and latitude are required'
            });
        }

        const point = {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
        };

        const complaints = await Complaint.find({
            location: {
                $near: {
                    $geometry: point,
                    $maxDistance: parseInt(maxDistance) // in meters
                }
            },
            status: { $ne: 'resolved' } // Optionally filter out resolved complaints
        })
        .populate('user', 'firstName lastName')
        .limit(50); // Limit results

        res.status(200).json({
            success: true,
            count: complaints.length,
            data: complaints
        });
    } catch (error) {
        console.error('Error getting nearby complaints:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching nearby complaints'
        });
    }
};

// Export the getNearbyComplaints function
exports.getNearbyComplaints = getNearbyComplaints;