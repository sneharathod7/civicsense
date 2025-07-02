const mongoose = require('mongoose');

// Define the image schema for better structure
const ImageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  filename: String,
  mimetype: String,
  size: Number,
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const ReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  userMobile: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(v) {
          return v.length === 2 && 
                 typeof v[0] === 'number' && 
                 typeof v[1] === 'number' &&
                 v[0] >= -180 && v[0] <= 180 &&
                 v[1] >= -90 && v[1] <= 90;
        },
        message: 'Coordinates must be valid [longitude, latitude]'
      }
    },
    address: {
      type: String,
      trim: true
    }
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  // Main images array with detailed schema
  images: [ImageSchema],
  // Legacy photos field for backward compatibility
  photos: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['pending', 'verified', 'assigned', 'in-progress', 'resolved', 'rejected'],
    default: 'pending'
  },
  assignedTo: {
    type: String,
    trim: true
  },
  lastUpdate: String,
  overdueBy: String
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

// Create a 2dsphere index for geospatial queries
ReportSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Report', ReportSchema);
