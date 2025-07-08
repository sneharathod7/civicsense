const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    phone: { type: String },
    email: { type: String, required: true },
    department: { type: String, required: true },
    status: { type: String, enum: ['assigned', 'not assigned'], default: 'not assigned' },
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', default: null }
  },
  {
    timestamps: true,
    collection: 'employees'
  }
);

module.exports = mongoose.model('Employee', employeeSchema);
