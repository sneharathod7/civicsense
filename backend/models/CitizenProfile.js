const mongoose = require('mongoose');

const citizenProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
    default: null
  },
  phoneNumber: {
    type: String,
    trim: true,
    default: null
  },
  whatsappNumber: {
    type: String,
    trim: true,
    default: null
  },
  address: {
    type: String,
    trim: true,
    default: null
  },
  state: {
    type: String,
    trim: true,
    required: [true, 'State is required']
  },
  city: {
    type: String,
    trim: true,
    required: [true, 'City is required']
  },
  pinCode: {
    type: String,
    trim: true,
    required: [true, 'PIN code is required'],
    match: [/^\d{6}$/, 'Please enter a valid 6-digit PIN code']
  },
  religion: {
    type: String,
    trim: true,
    default: null
  },
  category: {
    type: String,
    trim: true,
    default: null
  },
  profileImage: {
    type: String,
    default: null
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  rank: {
    type: String,
    default: 'Citizen',
    enum: ['Citizen', 'Active Citizen', 'Super Citizen', 'Community Leader']
  },
  specializationAreas: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes are defined in the schema

// Virtual for full name
citizenProfileSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Middleware to populate user data when querying
citizenProfileSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'email username role'
  });
  next();
});

const CitizenProfile = mongoose.model('CitizenProfile', citizenProfileSchema);

module.exports = CitizenProfile;
