const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const CitizenProfile = require('../models/CitizenProfile');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const Achievement = require('../models/Achievement');

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private/Admin
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Create user
// @route   POST /api/v1/users
// @access  Private/Admin
exports.createUser = asyncHandler(async (req, res, next) => {
  const user = await User.create(req.body);

  res.status(201).json({
    success: true,
    data: user
  });
});

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  // Delete user's photo if exists
  if (user.photo && user.photo !== 'default.jpg') {
    const filePath = path.join(
      __dirname,
      `../public/uploads/users/${user.photo}`
    );
    
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  await user.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get current logged in user
// @route   GET /api/v1/users/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .populate({
      path: 'profile',
      select: 'dateOfBirth gender state district city profileImage points rank'
    });

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Combine user and profile data
  const userData = {
    ...user.toObject(),
    dateOfBirth: user.profile?.dateOfBirth,
    gender: user.profile?.gender,
    state: user.profile?.state,
    city: user.profile?.city,
    points: user.profile?.points,
    rank: user.profile?.rank,
    photo: user.profile?.profileImage
  };

  res.status(200).json({
    success: true,
    data: userData
  });
});

// @desc    Update user details
// @route   PUT /api/v1/users/updatedetails
// @access  Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const { address, city, state, pinCode } = req.body;

  // Validate PIN code if provided
  if (pinCode && !/^\d{6}$/.test(pinCode)) {
    return next(new ErrorResponse('Please enter a valid 6-digit PIN code', 400));
  }

  // Update user
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { address, city, state, pinCode },
    {
      new: true,
      runValidators: true
    }
  );

  // Update citizen profile if exists
  if (user.profile) {
    await CitizenProfile.findByIdAndUpdate(
      user.profile,
      { address, city, state, pinCode },
      {
        new: true,
        runValidators: true
      }
    );
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user email
// @route   PUT /api/v1/users/updateemail
// @access  Private
exports.updateEmail = asyncHandler(async (req, res, next) => {
  // Check if email exists
  const emailExists = await User.findOne({ email: req.body.email });
  if (emailExists) {
    return next(new ErrorResponse('Email already exists', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      email: req.body.email,
      verified: process.env.NODE_ENV === 'development', // Auto-verify in development
      ...(process.env.NODE_ENV !== 'development' && {
        emailVerificationToken: crypto.randomBytes(20).toString('hex'),
        emailVerificationExpire: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      })
    },
    {
      new: true,
      runValidators: true
    }
  );

  // Send verification email in production
  if (process.env.NODE_ENV !== 'development') {
    const verificationUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/verifyemail/${user.emailVerificationToken}`;
    const message = `Please click on the link to verify your email: \n\n ${verificationUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Email Verification',
        message
      });

      res.status(200).json({
        success: true,
        data: user,
        message: 'Verification email sent'
      });
    } catch (err) {
      user.emailVerificationToken = undefined;
      user.emailVerificationExpire = undefined;
      await user.save();

      return next(new ErrorResponse('Email could not be sent', 500));
    }
  } else {
    // In development, just return success
    res.status(200).json({
      success: true,
      data: user
    });
  }
});

// @desc    Update user phone
// @route   PUT /api/v1/users/updatephone
// @access  Private
exports.updatePhone = asyncHandler(async (req, res, next) => {
  // Check if phone exists
  const phoneExists = await User.findOne({ mobile: req.body.mobile });
  if (phoneExists) {
    return next(new ErrorResponse('Phone number already exists', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      mobile: req.body.mobile
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update password
// @route   PUT /api/v1/users/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Wrong password'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Upload user photo
// @route   PUT /api/v1/users/photo
// @access  Private
exports.uploadPhoto = asyncHandler(async (req, res, next) => {
  if (!req.files || !req.files.photo) {
    return next(new ErrorResponse('Please upload a file', 400));
  }

  const file = req.files.photo;

  // Validate file type
  if (!file.mimetype.startsWith('image')) {
    return next(new ErrorResponse('Please upload an image file', 400));
  }

  // Check file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return next(new ErrorResponse('Image must be less than 2MB', 400));
  }

  // Create custom filename with original extension
  const ext = path.extname(file.name);
  const fileName = `user-${req.user.id}-${Date.now()}${ext}`;

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Move file to upload directory
  const filePath = path.join(uploadsDir, fileName);
  
  try {
    await file.mv(filePath);

    // Delete old photo if exists
    if (req.user.photo) {
      const oldPhotoPath = path.join(uploadsDir, req.user.photo);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Update user and citizen profile
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { photo: fileName },
      { new: true }
    );

    if (user.profile) {
      await CitizenProfile.findByIdAndUpdate(
        user.profile,
        { profileImage: fileName }
      );
    }

    res.status(200).json({
      success: true,
      data: { photo: fileName }
    });
  } catch (err) {
    console.error('File upload error:', err);
    return next(new ErrorResponse('Error uploading file', 500));
  }
});

// @desc    Resize user photo
// @route   - (middleware)
// @access  Private
exports.resizeUserPhoto = asyncHandler(async (req, res, next) => {
  if (!req.files) return next();

  const file = req.files.file;
  const ext = path.parse(file.name).ext;
  const filename = `user-${req.user.id}-${Date.now()}${ext}`;
  const uploadPath = path.join(__dirname, `../public/uploads/users/${filename}`);

  // Resize and save the image
  // Note: You'll need to install and configure sharp or another image processing library
  // For now, we'll just move the file without resizing
  
  // In a real app, you would do something like:
  // await sharp(file.data)
  //   .resize(500, 500)
  //   .toFormat('jpeg')
  //   .jpeg({ quality: 90 })
  //   .toFile(uploadPath);

  // For now, just move the file
  file.mv(uploadPath, (err) => {
    if (err) {
      console.error(err);
      return next(new ErrorResponse(`Problem with file upload`, 500));
    }
    
    req.file = {
      filename,
      path: `/uploads/users/${filename}`
    };
    
    next();
  });
});

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

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    mobile: req.body.mobile
  };

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
        new: true,
        runValidators: true
  });

  // Check if this is the first time the profile is being completed
  if (user && !user.profileCompleted) {
    // Award points for completing profile
    await updateAchievementPoints(user.id, 20, 'Profile completed');
    
    // Mark profile as completed
    user.profileCompleted = true;
    await user.save();
  }

    res.status(200).json({
      success: true,
    data: user
      });
});

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  // Remove password from output
  user.password = undefined;

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      data: user
    });
};
