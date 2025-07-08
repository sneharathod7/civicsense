const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const department = require('../middleware/department');
const { getDashboardStats } = require('../controllers/dashboardController');

router.get('/', auth, department, getDashboardStats);

module.exports = router; 