const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const adminEmailToDepartment = require('../utils/adminMapping');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email }).select('+password');
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
  if (!adminEmailToDepartment[email]) return res.status(403).json({ error: 'No department assigned' });
  const department = adminEmailToDepartment[email];
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1d' });
  res.json({ token, department });
});

module.exports = router;