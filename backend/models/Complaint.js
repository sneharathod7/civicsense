const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Complaint = sequelize.define('Complaint', {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    issueType: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    latitude: { type: DataTypes.FLOAT, allowNull: false },
    longitude: { type: DataTypes.FLOAT, allowNull: false },
    address: { type: DataTypes.STRING },
    department: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'pending' },
    images: { type: DataTypes.JSON }, // array of image URLs/paths
    ticketId: { type: DataTypes.STRING, unique: true },
    upvotes: { type: DataTypes.INTEGER, defaultValue: 0 },
    expectedResolutionDate: { type: DataTypes.DATE },
    resolutionNotes: { type: DataTypes.TEXT }
}, {
    timestamps: true
});

module.exports = Complaint; 