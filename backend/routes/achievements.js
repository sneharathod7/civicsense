const express = require('express');
const {
  getAchievements
} = require('../controllers/achievementController');

const router = express.Router();

const { protect } = require('../middleware/auth');

// Protect all routes
router.use(protect);

router.route('/')
  .get(getAchievements);

module.exports = router; 