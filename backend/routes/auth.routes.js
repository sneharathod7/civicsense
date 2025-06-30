const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMe, 
  sendOtp, 
  verifyOtp,
  forgotPassword,
  resetPassword,
  updateDetails,
  updatePassword,
  logout
} = require('../controllers/authController');

// Import auth middleware
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/signup', register); // Alias for /register
router.post('/login', login);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
// OTP endpoints
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

// Protected routes (require authentication)
router.use(protect);

router.get('/me', getMe);
router.put('/updatedetails', updateDetails);
router.put('/updatepassword', updatePassword);
router.get('/logout', logout);

module.exports = router;
