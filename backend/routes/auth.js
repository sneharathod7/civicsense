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
// Pending signups before verification { key: { details, otp } }
const pendingUsers = {};
// OTP map for verified flow keyed by contact for quick check
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
    // Save details to pending store, wait for OTP verification
    pendingUsers[email] = { firstName, lastName, email, mobile, address, password: hashedPassword, role };
    return res.json({ success: true, message: 'Registration saved. Click “Send OTP” to receive your code.', pending: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// OTP verification route
// Route to send OTP on demand
router.post('/send-otp', async (req, res) => {
  const { email, mobile, method = 'email' } = req.body;
  const pending = pendingUsers[email];
  if (!pending) return res.status(400).json({ success: false, message: 'No pending registration found.' });
  const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
  otps[email] = otp;
  otps[mobile] = otp;
  try {
    if (method === 'sms') {
      await sendOtpSms(mobile, otp);
    } else {
      await sendOtp(email, otp);
    }
    res.json({ success: true, message: 'OTP sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to send OTP.' });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { email, mobile, otp } = req.body;
  const key = email || mobile;
  if (!key || !otp) return res.status(400).json({ success: false, message: 'Contact and OTP required.' });
  if (otps[key] !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP.' });
  try {
        // If user already exists (shouldn\'t), update; otherwise create from pending
    let user = await User.findOne({ where: { email } });
    if (!user) {
      const pending = pendingUsers[email];
      if (!pending) return res.status(400).json({ success: false, message: 'No pending registration.' });
      user = await User.create({ ...pending, verified: true });
      if (pending.role === 'Citizen') {
        await CitizenProfile.create({ userId: user.id });
      } else if (pending.role === 'Admin') {
        await MunicipalOfficial.create({ userId: user.id });
      }
      delete pendingUsers[email];
    } else {
      user.verified = true;
      await user.save();
    }
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
    const { email, mobile, method = 'email' } = req.body;
  if (method === 'sms') {
    if (!mobile) return res.status(400).json({ success: false, message: 'Mobile required.' });
  } else {
    if (!email) return res.status(400).json({ success: false, message: 'Email required.' });
  }
  try {
    const key = method === 'sms' ? mobile : email;
    let user = await User.findOne({ where: { email } });
    const pending = pendingUsers[email];
    if (!user && !pending) return res.status(400).json({ success: false, message: 'No user or pending registration found.' });
    const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
    otps[key] = otp;
    try {
      if (method === 'sms') {
        await sendOtpSms(mobile, otp);
      } else {
        await sendOtp(email, otp);
      }
      res.json({ success: true, message: 'OTP resent.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Failed to resend OTP.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
