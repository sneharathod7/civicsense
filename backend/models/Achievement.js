const mongoose = require('mongoose');

const AchievementSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    totalPoints: {
        type: Number,
        default: 0
    },
    badges: [{
        name: {
            type: String,
            required: true
        },
        category: {
            type: String,
            enum: ['reports', 'resolutions', 'engagement', 'profile'],
            required: true
        },
        earnedAt: {
            type: Date,
            default: Date.now
        },
        progress: {
            current: {
                type: Number,
                default: 0
            },
            total: {
                type: Number,
                required: true
            }
        }
    }],
    stats: {
        totalReports: {
            type: Number,
            default: 0
        },
        resolvedReports: {
            type: Number,
            default: 0
        },
        pointsHistory: [{
            points: Number,
            reason: String,
            type: {
                type: String,
                enum: ['earned', 'spent'],
                default: 'earned'
            },
            timestamp: {
                type: Date,
                default: Date.now
            }
        }]
    }
}, {
    timestamps: true
});

// Ensure unique user constraint
AchievementSchema.index({ user: 1 }, { unique: true });

module.exports = mongoose.model('Achievement', AchievementSchema); 