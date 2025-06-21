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
    allowNull: false
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'citizen_profiles',
  timestamps: true
});

User.hasOne(CitizenProfile, { foreignKey: 'userId', onDelete: 'CASCADE' });
CitizenProfile.belongsTo(User, { foreignKey: 'userId' });

module.exports = CitizenProfile;
