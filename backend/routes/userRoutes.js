const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getMe,
  updateDetails,
  updatePassword,
  updateEmail,
  updatePhone,
  uploadPhoto
} = require('../controllers/userController');

// Public routes (no authentication required)
router.post('/', createUser);

// All routes below this middleware will be protected
router.use(protect);

// User profile routes
router.get('/me', getMe);
router.put('/updatedetails', updateDetails);
router.put('/updatepassword', updatePassword);
router.put('/updateemail', updateEmail);
router.put('/updatephone', updatePhone);
router.put('/photo', uploadPhoto);

// Admin-only routes
router.use(authorize('admin'));

router
  .route('/')
  .get(getUsers);

router
  .route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

module.exports = router;
