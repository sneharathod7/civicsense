require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();

// CORS Configuration
const corsOptions = {
  origin: ['http://localhost:5000', 'http://localhost:3005'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory: ${uploadsDir}`);
}
app.use('/uploads', express.static(uploadsDir));


// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Route Loader with Error Handling
function loadRoute(app, path, route) {
  try {
    const router = require(`./routes/${route}`);
    app.use(path, router);
    console.log(`✓ Route loaded: ${path}`);
  } catch (err) {
    console.error(`✗ Error loading route ${path}:`, err.message);
    throw err;
  }
}

// Load Routes
try {
  // API Routes
  loadRoute(app, '/api/auth', 'auth');
  loadRoute(app, '/api/dashboard', 'dashboard');
  loadRoute(app, '/api/complaints', 'complaints');
  loadRoute(app, '/api/employees', 'employees');
  loadRoute(app, '/api/reports', 'reports');
  loadRoute(app, '/api/test', 'test');
  
  console.log('✓ All routes loaded successfully');
} catch (err) {
  console.error('✗ Failed to load routes:', err.message);
  process.exit(1);
}

// Serve static files
app.use(express.static(path.join(__dirname, '../admin-portal'), {
  index: 'index.html'
}));

// Serve index.html for all other routes (SPA support)
app.get('/:path(*)', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin-portal/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
const PORT = process.env.PORT || 3005;
const server = app.listen(PORT, () => {
  console.log(`✓ Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`✓ Access the admin panel at: http://localhost:${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});