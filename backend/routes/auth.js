const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOtp } = require('../utils/emailSender');

// In-memory OTPs (for demo; use Redis or DB in prod)
const otps = {};



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
    await User.create({ firstName, lastName, email, mobile, address, password: hashedPassword, role, verified: false });
    await await sendOtp(email, otp);
    res.json({ success: true, message: 'OTP sent to email/mobile.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// OTP verification route
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required.' });
  if (otps[email] !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP.' });
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ success: false, message: 'User not found.' });
    user.verified = true;
    await user.save();
    delete otps[email];
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
    res.json({ success: true, message: 'Login successful.', role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email required.' });
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ success: false, message: 'User not found.' });
    const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
    otps[email] = otp;
    await sendOtp(email, otp);
    res.json({ success: true, message: 'OTP resent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
