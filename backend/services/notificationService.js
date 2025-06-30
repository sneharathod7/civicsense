const User = require('../models/User');
const Notification = require('../models/Notification');
const emailSender = require('../utils/emailSender');
const logger = require('../utils/logger');
const { cache } = require('../utils/cache');

class NotificationService {
  constructor() {
    this.channels = ['database', 'email'];
  }

  /**
   * Send a notification to a user
   * @param {Object} options - Notification options
   * @param {string} options.userId - ID of the user to notify
   * @param {string} options.type - Notification type (e.g., 'complaint_created', 'status_update')
   * @param {string} options.title - Notification title
   * @param {string} options.message - Notification message
   * @param {Object} options.data - Additional data for the notification
   * @param {Array} [options.channels] - Channels to use (defaults to all)
   * @returns {Promise<Object>} Notification result
   */
  async sendNotification({
    userId,
    type,
    title,
    message,
    data = {},
    channels = this.channels,
  }) {
    try {
      // Get user information
      const user = await User.findById(userId).select('+email +notificationPreferences');
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Check if user has notification preferences
      const userChannels = channels.filter(channel => 
        !user.notificationPreferences || 
        !user.notificationPreferences.disabledChannels || 
        !user.notificationPreferences.disabledChannels.includes(channel)
      );

      // Process each channel
      const results = {};
      
      for (const channel of userChannels) {
        try {
          switch (channel) {
            case 'database':
              results.database = await this._saveToDatabase(userId, type, title, message, data);
              break;
              
            case 'email':
              if (user.email) {
                results.email = await this._sendEmail(user.email, type, title, message, data);
              }
              break;
              
            case 'sms':
              // Implement SMS notification
              break;
              
            case 'push':
              // Implement push notification
              break;
              
            default:
              logger.warn(`Unsupported notification channel: ${channel}`);
          }
        } catch (error) {
          logger.error(`Error sending ${channel} notification`, {
            error: error.message,
            stack: error.stack,
            userId,
            type
          });
          results[channel] = { success: false, error: error.message };
        }
      }

      // Invalidate user notifications cache
      await this._invalidateUserNotificationsCache(userId);
      
      return {
        success: true,
        results
      };
    } catch (error) {
      logger.error('Error in sendNotification', {
        error: error.message,
        stack: error.stack,
        userId,
        type
      });
      throw error;
    }
  }

  /**
   * Send a notification to multiple users
   * @param {Array} userIds - Array of user IDs to notify
   * @param {Object} options - Notification options
   * @returns {Promise<Object>} Results for each user
   */
  async broadcastNotification(userIds, options) {
    const results = {};
    
    for (const userId of userIds) {
      try {
        results[userId] = await this.sendNotification({
          ...options,
          userId
        });
      } catch (error) {
        results[userId] = {
          success: false,
          error: error.message
        };
      }
    }
    
    return results;
  }

  /**
   * Get user notifications
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} User notifications
   */
  async getUserNotifications(userId, options = {}) {
    const { 
      page = 1, 
      limit = 10, 
      read = null, 
      type = null,
      useCache = true
    } = options;
    
    const cacheKey = `notifications:${userId}:${page}:${limit}:${read}:${type}`;
    
    // Try to get from cache first
    if (useCache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    // Build query
    const query = { user: userId };
    
    if (read !== null) {
      query.read = read;
    }
    
    if (type) {
      query.type = type;
    }
    
    // Get notifications
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    // Cache the result
    if (useCache) {
      await cache.set(cacheKey, notifications, 60); // Cache for 1 minute
    }
    
    return notifications;
  }

  /**
   * Mark notifications as read
   * @param {string} userId - User ID
   * @param {string|Array} notificationIds - Notification ID(s) to mark as read
   * @returns {Promise<Object>} Update result
   */
  async markAsRead(userId, notificationIds) {
    const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
    
    const result = await Notification.updateMany(
      {
        _id: { $in: ids },
        user: userId,
        read: false
      },
      {
        $set: { 
          read: true,
          readAt: new Date()
        }
      }
    );
    
    // Invalidate cache
    await this._invalidateUserNotificationsCache(userId);
    
    return result;
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      {
        user: userId,
        read: false
      },
      {
        $set: { 
          read: true,
          readAt: new Date()
        }
      }
    );
    
    // Invalidate cache
    await this._invalidateUserNotificationsCache(userId);
    
    return result;
  }

  /**
   * Get unread notification count for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Count of unread notifications
   */
  async getUnreadCount(userId) {
    const cacheKey = `notifications:unread:${userId}`;
    
    // Try to get from cache first
    const cached = await cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    
    const count = await Notification.countDocuments({
      user: userId,
      read: false
    });
    
    // Cache the result for 30 seconds
    await cache.set(cacheKey, count, 30);
    
    return count;
  }

  // Private methods

  /**
   * Save notification to database
   * @private
   */
  async _saveToDatabase(userId, type, title, message, data) {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      data,
      read: false
    });
    
    return { success: true, notificationId: notification._id };
  }

  /**
   * Send email notification
   * @private
   */
  async _sendEmail(email, type, title, message, data) {
    try {
      await emailSender.sendEmail({
        to: email,
        subject: title,
        template: 'notification',
        data: {
          title,
          message,
          ...data,
          type
        }
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Error sending email notification', {
        email,
        type,
        error: error.message,
        stack: error.stack
      });
      
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Invalidate user notifications cache
   * @private
   */
  async _invalidateUserNotificationsCache(userId) {
    // Invalidate all notification-related cache for the user
    const keys = await cache.keys(`notifications:${userId}:*`);
    keys.push(`notifications:unread:${userId}`);
    
    if (keys.length > 0) {
      await cache.del(keys);
    }
  }
}

// Create and export a singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;
