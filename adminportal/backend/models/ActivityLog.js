const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['report_created', 'report_updated', 'report_completed', 'note_added', 'status_changed', 'assigned']
  },
  description: {
    type: String,
    required: true
  },
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report'
  },
  employee: {
    employeeId: String,
    name: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster querying
activityLogSchema.index({ 'employee.employeeId': 1, timestamp: -1 });
activityLogSchema.index({ reportId: 1, timestamp: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
