const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  // Basic Information
  title: { 
    type: String, 
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  category: { 
    type: String, 
    required: [true, 'Category is required'],
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: { 
    type: String, 
    enum: ['reported', 'in-progress', 'resolved', 'closed', 'rejected'],
    default: 'reported' 
  },
  
  // Location Information
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    },
    address: String,
    landmark: String
  },
  
  // Department and Assignment
  department: { 
    type: String, 
    required: [true, 'Department is required'] 
  },
  assignedTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  dueDate: { 
    type: Date 
  },
  
  // User Information
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reporter is required']
  },
  
  // Media
  images: [{
    url: String,
    thumbnailUrl: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status Tracking
  inProgressAt: Date,
  resolvedAt: Date,
  closedAt: Date,
  rejectedAt: Date,
  
  // Metadata
  comments: [
    {
      text: { 
        type: String, 
        required: [true, 'Comment text is required'] 
      },
      postedBy: { 
        type: String, 
        required: [true, 'Comment author is required'] 
      },
      status: String,
      timestamp: { 
        type: Date, 
        default: Date.now 
      }
    }
  ],
  
  resolutionDetails: String,
  
  // System Fields
  isActive: {
    type: Boolean,
    default: true
  },
  
  // For backward compatibility
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
ReportSchema.index({ location: '2dsphere' });
ReportSchema.index({ status: 1 });
ReportSchema.index({ category: 1 });
ReportSchema.index({ department: 1 });
ReportSchema.index({ reportedBy: 1 });

module.exports = mongoose.model('Report', ReportSchema);