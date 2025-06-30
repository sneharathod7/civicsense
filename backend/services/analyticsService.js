const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { cache } = require('../utils/cache');
const logger = require('../utils/logger');

class AnalyticsService {
  constructor() {
    this.cacheTTL = 300; // 5 minutes cache TTL
  }

  /**
   * Get dashboard statistics
   * @returns {Promise<Object>} Dashboard statistics
   */
  async getDashboardStats() {
    const cacheKey = 'analytics:dashboard:stats';
    
    // Try to get from cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      // Run all stats queries in parallel
      const [
        totalUsers,
        activeUsers,
        totalComplaints,
        openComplaints,
        inProgressComplaints,
        resolvedComplaints,
        complaintsByType,
        complaintsByStatus,
        complaintsByDepartment,
        complaintsByMonth,
        recentActivities
      ] = await Promise.all([
        this._getTotalUsers(),
        this._getActiveUsers(),
        this._getTotalComplaints(),
        this._getComplaintsByStatus('pending'),
        this._getComplaintsByStatus('in_progress'),
        this._getComplaintsByStatus('resolved'),
        this._getComplaintsByType(),
        this._getComplaintsByStatus(),
        this._getComplaintsByDepartment(),
        this._getComplaintsByMonth(),
        this._getRecentActivities()
      ]);
      
      const stats = {
        users: {
          total: totalUsers,
          active: activeUsers,
          newThisMonth: await this._getNewUsersThisMonth()
        },
        complaints: {
          total: totalComplaints,
          open: openComplaints,
          inProgress: inProgressComplaints,
          resolved: resolvedComplaints,
          byType: complaintsByType,
          byStatus: complaintsByStatus,
          byDepartment: complaintsByDepartment,
          byMonth: complaintsByMonth,
          resolutionTime: await this._getAverageResolutionTime()
        },
        activities: recentActivities
      };
      
      // Cache the result
      await cache.set(cacheKey, stats, this.cacheTTL);
      
      return stats;
    } catch (error) {
      logger.error('Error getting dashboard stats', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get user analytics
   * @param {Object} options - Query options
   * @returns {Promise<Object>} User analytics
   */
  async getUserAnalytics(options = {}) {
    const cacheKey = `analytics:users:${JSON.stringify(options)}`;
    
    // Try to get from cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const [
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        usersByRole,
        usersBySignupMethod,
        usersByLocation,
        userGrowth,
        userActivity
      ] = await Promise.all([
        this._getTotalUsers(),
        this._getActiveUsers(),
        this._getNewUsersThisMonth(),
        this._getUsersByRole(),
        this._getUsersBySignupMethod(),
        this._getUsersByLocation(),
        this._getUserGrowth(),
        this._getUserActivity()
      ]);
      
      const analytics = {
        total: totalUsers,
        active: activeUsers,
        newThisMonth: newUsersThisMonth,
        byRole: usersByRole,
        bySignupMethod: usersBySignupMethod,
        byLocation: usersByLocation,
        growth: userGrowth,
        activity: userActivity
      };
      
      // Cache the result
      await cache.set(cacheKey, analytics, this.cacheTTL);
      
      return analytics;
    } catch (error) {
      logger.error('Error getting user analytics', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get complaint analytics
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Complaint analytics
   */
  async getComplaintAnalytics(options = {}) {
    const cacheKey = `analytics:complaints:${JSON.stringify(options)}`;
    
    // Try to get from cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const [
        totalComplaints,
        openComplaints,
        inProgressComplaints,
        resolvedComplaints,
        complaintsByType,
        complaintsByStatus,
        complaintsByDepartment,
        complaintsByMonth,
        averageResolutionTime,
        topComplaintAreas,
        complaintTrends
      ] = await Promise.all([
        this._getTotalComplaints(),
        this._getComplaintsByStatus('pending'),
        this._getComplaintsByStatus('in_progress'),
        this._getComplaintsByStatus('resolved'),
        this._getComplaintsByType(),
        this._getComplaintsByStatus(),
        this._getComplaintsByDepartment(),
        this._getComplaintsByMonth(),
        this._getAverageResolutionTime(),
        this._getTopComplaintAreas(),
        this._getComplaintTrends()
      ]);
      
      const analytics = {
        total: totalComplaints,
        open: openComplaints,
        inProgress: inProgressComplaints,
        resolved: resolvedComplaints,
        byType: complaintsByType,
        byStatus: complaintsByStatus,
        byDepartment: complaintsByDepartment,
        byMonth: complaintsByMonth,
        averageResolutionTime,
        topAreas: topComplaintAreas,
        trends: complaintTrends
      };
      
      // Cache the result
      await cache.set(cacheKey, analytics, this.cacheTTL);
      
      return analytics;
    } catch (error) {
      logger.error('Error getting complaint analytics', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // Private helper methods

  // User analytics
  async _getTotalUsers() {
    return User.countDocuments();
  }

  async _getActiveUsers(days = 30) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    return User.countDocuments({
      lastActive: { $gte: date }
    });
  }

  async _getNewUsersThisMonth() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return User.countDocuments({
      createdAt: { $gte: firstDay }
    });
  }

  async _getUsersByRole() {
    return User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $project: { role: '$_id', count: 1, _id: 0 } }
    ]);
  }

  async _getUsersBySignupMethod() {
    return User.aggregate([
      { $group: { _id: '$signupMethod', count: { $sum: 1 } } },
      { $project: { method: '$_id', count: 1, _id: 0 } }
    ]);
  }

  async _getUsersByLocation() {
    return User.aggregate([
      { $match: { 'address.city': { $exists: true, $ne: '' } } },
      { $group: { _id: '$address.city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { city: '$_id', count: 1, _id: 0 } }
    ]);
  }

  async _getUserGrowth(days = 365) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    return User.aggregate([
      { $match: { createdAt: { $gte: date } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          count: 1,
          _id: 0
        }
      }
    ]);
  }

  async _getUserActivity() {
    return User.aggregate([
      {
        $project: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$lastActive' } },
          userId: '$_id'
        }
      },
      {
        $group: {
          _id: '$date',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);
  }

  // Complaint analytics
  async _getTotalComplaints() {
    return Complaint.countDocuments();
  }

  async _getComplaintsByStatus(status = null) {
    if (status) {
      return Complaint.countDocuments({ status });
    }
    
    return Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } }
    ]);
  }

  async _getComplaintsByType() {
    return Complaint.aggregate([
      { $group: { _id: '$issueType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { type: '$_id', count: 1, _id: 0 } }
    ]);
  }

  async _getComplaintsByDepartment() {
    return Complaint.aggregate([
      { $match: { department: { $exists: true, $ne: '' } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { department: '$_id', count: 1, _id: 0 } }
    ]);
  }

  async _getComplaintsByMonth(months = 12) {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    
    return Complaint.aggregate([
      { $match: { createdAt: { $gte: date } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: 1
            }
          },
          count: 1,
          _id: 0
        }
      }
    ]);
  }

  async _getAverageResolutionTime() {
    const result = await Complaint.aggregate([
      { $match: { status: 'resolved', resolvedAt: { $exists: true } } },
      {
        $project: {
          resolutionTime: {
            $divide: [
              { $subtract: ['$resolvedAt', '$createdAt'] },
              1000 * 60 * 60 // Convert to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          average: { $avg: '$resolutionTime' },
          count: { $sum: 1 },
          min: { $min: '$resolutionTime' },
          max: { $max: '$resolutionTime' }
        }
      }
    ]);
    
    return result[0] || { average: 0, count: 0, min: 0, max: 0 };
  }

  async _getTopComplaintAreas(limit = 10) {
    return Complaint.aggregate([
      { $match: { 'location.coordinates': { $exists: true } } },
      {
        $group: {
          _id: {
            type: 'Point',
            coordinates: [
              { $arrayElemAt: ['$location.coordinates', 0] },
              { $arrayElemAt: ['$location.coordinates', 1] }
            ]
          },
          count: { $sum: 1 },
          types: { $addToSet: '$issueType' },
          statuses: { $addToSet: '$status' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $project: {
          location: '$_id',
          count: 1,
          types: 1,
          statuses: 1,
          _id: 0
        }
      }
    ]);
  }

  async _getComplaintTrends(days = 30) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    return Complaint.aggregate([
      { $match: { createdAt: { $gte: date } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }

  // Recent activities
  async _getRecentActivities(limit = 10) {
    return Complaint.aggregate([
      { $sort: { updatedAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          ticketId: 1,
          issueType: 1,
          status: 1,
          updatedAt: 1,
          'user._id': 1,
          'user.name': { $concat: ['$user.firstName', ' ', '$user.lastName'] },
          'user.avatar': 1
        }
      }
    ]);
  }
}

// Create and export a singleton instance
const analyticsService = new AnalyticsService();

module.exports = analyticsService;
