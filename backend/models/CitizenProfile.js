const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const CitizenProfile = sequelize.define('CitizenProfile', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other', 'Prefer not to say'),
    allowNull: true
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  whatsappNumber: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  district: {
    type: DataTypes.STRING,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  religion: {
    type: DataTypes.STRING,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  profileImage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isPhoneVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  rank: {
    type: DataTypes.STRING,
    defaultValue: 'Citizen'
  },
  specializationAreas: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  tableName: 'citizen_profiles',
  timestamps: true
});

User.hasOne(CitizenProfile, { foreignKey: 'userId', onDelete: 'CASCADE' });
CitizenProfile.belongsTo(User, { foreignKey: 'userId' });

module.exports = CitizenProfile;
