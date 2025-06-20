const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');
const { createProxyMiddleware } = require('http-proxy-middleware');
const sequelize = require('./config/db');
require('./models/Complaint');
require('./models'); // Ensure User model is imported and synced
const axios = require('axios');

dotenv.config();

console.log('Starting Sequelize sync...');
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

sequelize.authenticate()
  .then(() => {
    console.log('Sequelize: Connection has been established successfully.');
    return sequelize.sync(); // Normal operation, do not force
  })
  .then(() => {
    console.log('MySQL tables synced');
    startApp();
  })
  .catch((err) => {
    console.error('Sequelize error:', err);
  });

const fs = require('fs');
const LOG_FILE = __dirname + '/server.log';
function logToFile(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line, { encoding: 'utf8' });
}

function startApp() {
  const app = express();

  // Import routes
  const authRoutes = require('./routes/auth');

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Auth API routes
  app.use('/api/auth', authRoutes);

  // Serve static files but disable automatic index.html so we control the root route
  app.use(express.static(path.join(__dirname, '../public'), { index: false }));

  // Configure multer for file uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });
  const upload = multer({ storage: storage });

  // Auth API
  app.use('/api/auth', require('./routes/auth'));

  // Proxy requests to ML API
  app.use('/api/predict-department', createProxyMiddleware({
    target: 'http://localhost:8000',
    pathRewrite: {
      '^/api/predict-department': '/predict'
    },
    changeOrigin: true
  }));

  // Proxy route for reverse geocoding
  app.get('/api/reverse-geocode', async (req, res) => {
    const { lat, lon } = req.query;
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          format: 'json',
          lat,
          lon
        },
        headers: {
          'User-Agent': 'CivicSenseApp/1.0 (your-email@example.com)'
        }
      });
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch address' });
    }
  });

  // Routes
  app.use('/api/complaints', require('./routes/complaints'));

  // Serve report.html for /report
  app.get('/report', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/report.html'));
  });

  // Default root -> login/signup page
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login-signup.html'));
  });

  // Serve login-signup.html for /login-signup
  app.get(['/login-signup', '/login-signup/'], (req, res) =>
    res.sendFile(path.join(__dirname, '../public/login-signup.html'))
  );

  // Serve index.html for all other routes (SPA)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    logToFile(err.stack);
    res.status(500).send('Something broke!');
  });

  // Start server
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    logToFile(`Server is running on port ${PORT}`);
  });
}
