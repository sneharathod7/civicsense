const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getMe,
  updateDetails,
  updatePassword,
  uploadUserPhoto,
  resizeUserPhoto
} = require('../controllers/userController');

const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');
const User = require('../models/User');

// All routes protected
router.use(protect);

// Get current user
router.get('/me', getMe);

// Update user details
router.put('/updatedetails', updateDetails);

// Update password
router.put('/updatepassword', updatePassword);

// Upload photo
router.put('/photo', uploadUserPhoto, resizeUserPhoto, (req, res, next) => {
  res.status(200).json({
    success: true,
    data: req.file ? req.file.filename : 'no file uploaded'
  });
});

// Admin routes
router.use(authorize('Admin'));

router
  .route('/')
  .get(advancedResults(User), getUsers)
  .post(createUser);

router
  .route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

module.exports = router;
