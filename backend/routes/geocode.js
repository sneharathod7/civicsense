const express = require('express');
const router = express.Router();
const axios = require('axios');

// @route   GET /api/geocode/reverse
// @desc    Reverse geocode coordinates to address
// @access  Public
router.get('/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'json',
        lat: parseFloat(lat),
        lon: parseFloat(lng),
        zoom: 18,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'CivicSense/1.0 (your-email@example.com)',
        'Accept': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    res.status(500).json({ error: 'Error getting address information' });
  }
});

module.exports = router;
