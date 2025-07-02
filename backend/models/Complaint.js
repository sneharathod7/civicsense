const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  issueType: {
    type: String,
    required: [true, 'Issue type is required'],
    enum: ['pothole', 'garbage', 'street_light', 'water_leak', 'other'],
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
  upvotes: {
    type: Number,
    default: 0
  },
  upvotedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  expectedResolutionDate: {
    type: Date
  },
  resolutionNotes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create a 2dsphere index for geospatial queries
complaintSchema.index({ 'location.coordinates': '2dsphere' });

// Virtual for getting the number of comments
complaintSchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

// Generate ticket ID before saving
complaintSchema.pre('save', function(next) {
  if (!this.ticketId) {
    this.ticketId = 'TKT-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  next();
});

// Check if model exists before compiling it
const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;