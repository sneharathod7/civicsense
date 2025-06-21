const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const MunicipalOfficial = sequelize.define('MunicipalOfficial', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'General'
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'municipal_officials',
  timestamps: true
});

User.hasOne(MunicipalOfficial, { foreignKey: 'userId', onDelete: 'CASCADE' });
MunicipalOfficial.belongsTo(User, { foreignKey: 'userId' });

module.exports = MunicipalOfficial;
