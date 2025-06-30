const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    index: true,
    enum: [
      'complaint_created',
      'complaint_updated',
      'complaint_resolved',
      'comment_added',
      'status_changed',
      'announcement',
      'system',
      'other'
    ]
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  data: {
    type: Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster querying
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

// Pre-save hook to set readAt when read is set to true
notificationSchema.pre('save', function(next) {
  if (this.isModified('read') && this.read && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

// Static method to get unread count for a user
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    user: userId,
    read: false
  });
};

// Static method to mark all notifications as read for a user
notificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    {
      user: userId,
      read: false
    },
    {
      $set: {
        read: true,
        readAt: new Date()
      }
    }
  );
};

// Virtual for formatted date
notificationSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function() {
  const seconds = Math.floor((new Date() - this.createdAt) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    
    if (interval >= 1) {
      return interval === 1 
        ? `${interval} ${unit} ago` 
        : `${interval} ${unit}s ago`;
    }
  }
  
  return 'just now';
});

// Create a text index for search
notificationSchema.index(
  { title: 'text', message: 'text' },
  { weights: { title: 2, message: 1 } }
);

module.exports = mongoose.model('Notification', notificationSchema);
