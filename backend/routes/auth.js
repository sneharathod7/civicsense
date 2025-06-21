const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { CitizenProfile, MunicipalOfficial } = require('../models');
const { sendOtp } = require('../utils/emailSender');
const { sendOtpSms } = require('../utils/smsSender');

// In-memory OTPs (for demo; use Redis or DB in prod)
const otps = {}; // { emailOrMobile: otp }



// Signup route
router.post('/signup', async (req, res) => {
  const { firstName, lastName, email, mobile, address, password, role } = req.body;
  if (!firstName || !lastName || !email || !mobile || !address || !password || !role) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }
  try {
    const existing = await User.findOne({ where: { [Op.or]: [{ email }, { mobile }] } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User already exists.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
    otps[email] = otp;
    otps[mobile] = otp;
    const newUser = await User.create({ firstName, lastName, email, mobile, address, password: hashedPassword, role, verified: false });
    // Create role specific profile
    if (role === 'Citizen') {
      await CitizenProfile.create({ userId: newUser.id });
    } else if (role === 'Admin') {
      await MunicipalOfficial.create({ userId: newUser.id });
    }
    
    res.json({ success: true, message: 'Signup successful. Please choose OTP delivery method.', userId: newUser.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// OTP verification route
router.post('/verify-otp', async (req, res) => {
  const { email, mobile, otp } = req.body;
  const key = email || mobile;
  if (!key || !otp) return res.status(400).json({ success: false, message: 'Contact and OTP required.' });
  if (otps[key] !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP.' });
  try {
    const whereClause = email ? { email } : { mobile };
    const user = await User.findOne({ where: whereClause });
    if (!user) return res.status(400).json({ success: false, message: 'User not found.' });
    user.verified = true;
    await user.save();
    delete otps[key];
    res.json({ success: true, message: 'OTP verified.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { emailOrMobile, password, role } = req.body;
  try {
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: emailOrMobile },
          { mobile: emailOrMobile }
        ],
        role
      }
    });
    if (!user) return res.status(400).json({ success: false, message: 'User not found.' });
    if (!user.verified) return res.status(400).json({ success: false, message: 'Account not verified.' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ success: false, message: 'Incorrect password.' });
    // For demo, skip JWT/session
    res.json({ success: true, message: 'Login successful.', role: user.role, userId: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  const { email, mobile, method } = req.body;
  if (!email && !mobile) return res.status(400).json({ success: false, message: 'Email or mobile required.' });
  try {
    const whereClause = email ? { email } : { mobile };
    const user = await User.findOne({ where: whereClause });
    if (!user) return res.status(400).json({ success: false, message: 'User not found.' });
    const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
    const key = email || mobile;
    otps[key] = otp;
    if (method === 'sms') {
      await sendOtpSms(user.mobile, otp);
    } else {
      await sendOtp(user.email, otp);
    }
    res.json({ success: true, message: 'OTP resent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
