const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const User = require('../models/User');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

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
      await fs.unlink(filePath);
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
  const user = await User.findById(req.user.id).populate({
    path: 'profile',
    select: 'firstName lastName mobile address'
  });

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user details
// @route   PUT /api/v1/users/updatedetails
// @access  Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
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

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update password
// @route   PUT /api/v1/users/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  // Send token response
  sendTokenResponse(user, 200, res);
});

// @desc    Upload photo for user
// @route   PUT /api/v1/users/photo
// @access  Private
exports.uploadUserPhoto = asyncHandler(async (req, res, next) => {
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
  const ext = path.parse(file.name).ext;
  file.name = `photo_${req.user.id}${ext}`;

  // Create uploads directory if it doesn't exist
  const uploadPath = path.join(__dirname, '../public/uploads/users');
  
  try {
    await fs.access(uploadPath);
  } catch (error) {
    await fs.mkdir(uploadPath, { recursive: true });
  }

  // Move file to uploads directory
  file.mv(`${uploadPath}/${file.name}`, async (err) => {
    if (err) {
      console.error(err);
      return next(new ErrorResponse(`Problem with file upload`, 500));
    }

    // Update user with new photo
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { photo: file.name },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: file.name
    });
  });
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
