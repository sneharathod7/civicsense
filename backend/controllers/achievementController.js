const Complaint = require('../models/Complaint');
const Report = require('../models/Report');
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const asyncHandler = require('../middleware/async');

// Badge definitions
const BADGES = {
    reports: [
        { name: 'First Report', description: 'Submit your first report', requirement: 1 },
        { name: 'Active Reporter', description: 'Submit 5 reports', requirement: 5 },
        { name: 'Dedicated Reporter', description: 'Submit 25 reports', requirement: 25 },
        { name: 'Expert Reporter', description: 'Submit 100 reports', requirement: 100 }
    ],
    resolutions: [
        { name: 'Problem Solver', description: 'Get your first report resolved', requirement: 1 },
        { name: 'Solution Seeker', description: 'Get 10 reports resolved', requirement: 10 },
        { name: 'Change Maker', description: 'Get 50 reports resolved', requirement: 50 }
    ],
    profile: [
        { name: 'Profile Pioneer', description: 'Complete your profile', requirement: 1 }
    ]
};

// @desc    Get user achievements
// @route   GET /api/v1/achievements
// @access  Private
exports.getAchievements = asyncHandler(async (req, res, next) => {
    // Get all user reports with their actual dates
    const userComplaints = await Complaint.find({ user: req.user.id })
        .select('createdAt status updatedAt');
    
    const userReports = await Report.find({ user: req.user.id })
        .select('createdAt status updatedAt');
    
    const totalReportsCount = userComplaints.length + userReports.length;
    
    // Count resolved reports
    const resolvedComplaints = userComplaints.filter(c => c.status === 'resolved');
    const resolvedReports = userReports.filter(r => r.status === 'resolved');
    const totalResolvedCount = resolvedComplaints.length + resolvedReports.length;

    // Get user profile data
    const user = await User.findById(req.user.id);
    const profileCompleted = user.profileCompleted || false;
    
    // Calculate points directly
    const reportPoints = totalReportsCount * 10;
    const resolvedPoints = totalResolvedCount * 50;
    const profilePoints = 20; // Always include profile points
    const totalPoints = reportPoints + resolvedPoints + profilePoints;
    
    // Manually create the points history with actual dates
    const pointsHistory = [];
    
    // Add profile points - since the user is viewing this page, they must have a profile
    pointsHistory.push({
        points: 20,
        reason: 'Profile creation',
        type: 'earned',
        timestamp: user.createdAt || new Date()
    });
    
    // Add points for each report with its actual creation date
    userComplaints.forEach(complaint => {
        pointsHistory.push({
            points: 10,
            reason: 'Report submitted',
            type: 'earned',
            timestamp: complaint.createdAt
        });
        
        // Add points for resolved reports
        if (complaint.status === 'resolved') {
            pointsHistory.push({
                points: 50,
                reason: 'Report resolved',
                type: 'earned',
                timestamp: complaint.updatedAt || new Date()
            });
        }
    });
    
    // Add points for each report from the Report model
    userReports.forEach(report => {
        pointsHistory.push({
            points: 10,
            reason: 'Report submitted',
            type: 'earned',
            timestamp: report.createdAt
        });
        
        // Add points for resolved reports
        if (report.status === 'resolved') {
            pointsHistory.push({
                points: 50,
                reason: 'Report resolved',
                type: 'earned',
                timestamp: report.updatedAt || new Date()
            });
        }
    });
    
    // Calculate earned badges
    const badges = [];
    
    // Profile badges - since the user is viewing this page, they must have a profile
    badges.push({
        name: 'Profile Pioneer',
        category: 'profile',
        description: 'Complete your profile',
        earnedAt: user.createdAt || new Date(),
        progress: {
            current: 1,
            total: 1
        }
    });
    
    // Report badges
    for (const badge of BADGES.reports) {
        if (totalReportsCount >= badge.requirement) {
            badges.push({
                name: badge.name,
                category: 'reports',
                description: badge.description,
                earnedAt: new Date(),
                progress: {
                    current: totalReportsCount,
                    total: badge.requirement
                }
            });
        }
    }
    
    // Resolution badges
    for (const badge of BADGES.resolutions) {
        if (totalResolvedCount >= badge.requirement) {
            badges.push({
                name: badge.name,
                category: 'resolutions',
                description: badge.description,
                earnedAt: new Date(),
                progress: {
                    current: totalResolvedCount,
                    total: badge.requirement
                }
            });
        }
    }
    
    // Return the response with calculated data
    res.status(200).json({
        success: true,
        data: {
            totalReports: totalReportsCount,
            resolvedReports: totalResolvedCount,
            points: totalPoints,
            badges: badges,
            pointsHistory: pointsHistory,
            profileCompleted
        }
    });
}); 
