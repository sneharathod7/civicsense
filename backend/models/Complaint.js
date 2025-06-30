const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  issueType: {
    type: String,
    required: [true, 'Issue type is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Location coordinates are required']
    },
    address: {
      type: String,
      required: [true, 'Address is required']
    }
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'rejected'],
    default: 'pending'
  },
  images: [{
    type: String, // Array of image URLs
    trim: true
  }],
  ticketId: {
    type: String,
    unique: true,
    trim: true
  },
  upvotes: {
    type: Number,
    default: 0
  },
  expectedResolutionDate: {
    type: Date
  },
  resolutionNotes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create a 2dsphere index for geospatial queries
complaintSchema.index({ 'location.coordinates': '2dsphere' });

// Generate ticket ID before saving
complaintSchema.pre('save', function(next) {
  if (!this.ticketId) {
    this.ticketId = 'TKT-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  next();
});

// Update the updatedAt field before saving
complaintSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Complaint = mongoose.model('Complaint', complaintSchema);
module.exports = Complaint;