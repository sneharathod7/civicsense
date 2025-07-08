require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/reports', require('./routes/reports'));

// Test routes (for debugging)
app.use('/api/test', require('./routes/test'));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../admin-portal')));

// Serve the login page as default for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin-portal/index.html'));
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 