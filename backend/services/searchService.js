const { Types } = require('mongoose');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { cache } = require('../utils/cache');
const logger = require('../utils/logger');

class SearchService {
  constructor() {
    this.cacheTTL = 300; // 5 minutes cache TTL
  }

  /**
   * Search across all models
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchAll(query, options = {}) {
    const { limit = 10, page = 1, types = ['complaints', 'users'] } = options;
    const cacheKey = `search:all:${query}:${page}:${limit}:${types.join(',')}`;
    
    // Try to get from cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const results = {};
      const searchPromises = [];
      
      // Search complaints if included in types
      if (types.includes('complaints')) {
        searchPromises.push(
          this.searchComplaints(query, { limit, page })
            .then(data => { results.complaints = data; })
        );
      }
      
      // Search users if included in types
      if (types.includes('users')) {
        searchPromises.push(
          this.searchUsers(query, { limit, page })
            .then(data => { results.users = data; })
        );
      }
      
      // Wait for all searches to complete
      await Promise.all(searchPromises);
      
      // Cache the result
      await cache.set(cacheKey, results, this.cacheTTL);
      
      return results;
    } catch (error) {
      logger.error('Error in searchAll', {
        query,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Search complaints
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchComplaints(query, options = {}) {
    const { 
      limit = 10, 
      page = 1, 
      status,
      issueType,
      department,
      userId,
      dateFrom,
      dateTo,
      sortBy = 'relevance',
      sortOrder = 'desc',
      location,
      radius = 10 // in kilometers
    } = options;
    
    const skip = (page - 1) * limit;
    const cacheKey = `search:complaints:${query}:${JSON.stringify(options)}`;
    
    // Try to get from cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      // Build the query
      const searchQuery = {};
      
      // Text search
      if (query && query.trim() !== '') {
        searchQuery.$text = { $search: query };
      }
      
      // Filters
      if (status) {
        searchQuery.status = status;
      }
      
      if (issueType) {
        searchQuery.issueType = issueType;
      }
      
      if (department) {
        searchQuery.department = department;
      }
      
      if (userId) {
        searchQuery.user = Types.ObjectId(userId);
      }
      
      // Date range filter
      const dateFilter = {};
      if (dateFrom) {
        dateFilter.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        dateFilter.$lte = new Date(dateTo);
      }
      if (Object.keys(dateFilter).length > 0) {
        searchQuery.createdAt = dateFilter;
      }
      
      // Location-based search (geospatial query)
      if (location && location.lat && location.lng) {
        searchQuery.location = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [location.lng, location.lat]
            },
            $maxDistance: radius * 1000, // Convert km to meters
            $minDistance: 0
          }
        };
      }
      
      // Build sort
      let sort = {};
      switch (sortBy) {
        case 'date':
          sort.createdAt = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'status':
          sort.status = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'upvotes':
          sort.upvotes = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'relevance':
        default:
          if (query && query.trim() !== '') {
            sort.score = { $meta: 'textScore' };
          } else {
            sort.createdAt = -1; // Default sort by newest
          }
      }
      
      // Execute the query
      const [complaints, total] = await Promise.all([
        Complaint.find(searchQuery)
          .select('-__v')
          .populate('user', 'firstName lastName email avatar')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Complaint.countDocuments(searchQuery)
      ]);
      
      const result = {
        results: complaints,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit
        },
        query: {
          ...options,
          query
        }
      };
      
      // Cache the result
      await cache.set(cacheKey, result, this.cacheTTL);
      
      return result;
    } catch (error) {
      logger.error('Error searching complaints', {
        query,
        options,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Search users
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchUsers(query, options = {}) {
    const { 
      limit = 10, 
      page = 1, 
      role,
      status,
      sortBy = 'relevance',
      sortOrder = 'desc'
    } = options;
    
    const skip = (page - 1) * limit;
    const cacheKey = `search:users:${query}:${JSON.stringify(options)}`;
    
    // Try to get from cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      // Build the query
      const searchQuery = {};
      
      // Text search on name, email, and other fields
      if (query && query.trim() !== '') {
        searchQuery.$or = [
          { $text: { $search: query } },
          { email: { $regex: query, $options: 'i' } },
          { 'address.city': { $regex: query, $options: 'i' } },
          { 'address.state': { $regex: query, $options: 'i' } },
          { 'address.country': { $regex: query, $options: 'i' } }
        ];
      }
      
      // Filters
      if (role) {
        searchQuery.role = role;
      }
      
      if (status) {
        searchQuery.status = status;
      }
      
      // Build sort
      let sort = {};
      switch (sortBy) {
        case 'name':
          sort.lastName = sortOrder === 'asc' ? 1 : -1;
          sort.firstName = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'email':
          sort.email = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'createdAt':
          sort.createdAt = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'relevance':
        default:
          if (query && query.trim() !== '') {
            sort.score = { $meta: 'textScore' };
          } else {
            sort.createdAt = -1; // Default sort by newest
          }
      }
      
      // Select fields to return
      const select = 'firstName lastName email avatar role status createdAt';
      
      // Execute the query
      const [users, total] = await Promise.all([
        User.find(searchQuery)
          .select(select)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(searchQuery)
      ]);
      
      const result = {
        results: users,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit
        },
        query: {
          ...options,
          query
        }
      };
      
      // Cache the result
      await cache.set(cacheKey, result, this.cacheTTL);
      
      return result;
    } catch (error) {
      logger.error('Error searching users', {
        query,
        options,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get search suggestions
   * @param {string} query - Search query
   * @param {string} type - Type of suggestions ('complaints', 'users', 'all')
   * @param {number} limit - Maximum number of suggestions
   * @returns {Promise<Object>} Search suggestions
   */
  async getSuggestions(query, type = 'all', limit = 5) {
    if (!query || query.trim() === '') {
      return { suggestions: [] };
    }
    
    const cacheKey = `search:suggestions:${query}:${type}:${limit}`;
    
    // Try to get from cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const suggestions = [];
      const searchPromises = [];
      
      // Get complaint suggestions
      if (type === 'all' || type === 'complaints') {
        searchPromises.push(
          Complaint.aggregate([
            {
              $search: {
                index: 'complaints_autocomplete',
                autocomplete: {
                  query: query,
                  path: 'title',
                  fuzzy: {
                    maxEdits: 2,
                    prefixLength: 3
                  }
                }
              }
            },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                type: { $literal: 'complaint' },
                id: '$_id',
                text: '$title',
                subtext: { $substr: ['$description', 0, 50] },
                icon: { $literal: 'report' }
              }
            }
          ]).then(results => {
            suggestions.push(...results);
          })
        );
      }
      
      // Get user suggestions
      if (type === 'all' || type === 'users') {
        searchPromises.push(
          User.aggregate([
            {
              $search: {
                index: 'users_autocomplete',
                compound: {
                  should: [
                    {
                      autocomplete: {
                        query: query,
                        path: 'email',
                        fuzzy: {
                          maxEdits: 2,
                          prefixLength: 3
                        }
                      }
                    },
                    {
                      autocomplete: {
                        query: query,
                        path: 'firstName',
                        fuzzy: {
                          maxEdits: 2,
                          prefixLength: 2
                        }
                      }
                    },
                    {
                      autocomplete: {
                        query: query,
                        path: 'lastName',
                        fuzzy: {
                          maxEdits: 2,
                          prefixLength: 2
                        }
                      }
                    }
                  ]
                }
              }
            },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                type: { $literal: 'user' },
                id: '$_id',
                text: { $concat: ['$firstName', ' ', '$lastName'] },
                subtext: '$email',
                icon: { $literal: 'person' }
              }
            }
          ]).then(results => {
            suggestions.push(...results);
          })
        );
      }
      
      // Wait for all searches to complete
      await Promise.all(searchPromises);
      
      // Sort by relevance (if available) and limit results
      const sortedSuggestions = suggestions
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, limit);
      
      const result = { suggestions: sortedSuggestions };
      
      // Cache the result for a short time (5 minutes)
      await cache.set(cacheKey, result, 300);
      
      return result;
    } catch (error) {
      logger.error('Error getting search suggestions', {
        query,
        type,
        error: error.message,
        stack: error.stack
      });
      return { suggestions: [] };
    }
  }
  
  /**
   * Invalidate search cache for a specific query or all queries
   * @param {string} [query] - Optional query to invalidate (if not provided, invalidates all)
   */
  async invalidateCache(query) {
    try {
      if (query) {
        // Invalidate cache for specific query
        const pattern = `search:*${query}*`;
        const keys = await cache.keys(pattern);
        
        if (keys.length > 0) {
          await cache.del(keys);
        }
      } else {
        // Invalidate all search cache
        const keys = await cache.keys('search:*');
        
        if (keys.length > 0) {
          await cache.del(keys);
        }
      }
    } catch (error) {
      logger.error('Error invalidating search cache', {
        query,
        error: error.message,
        stack: error.stack
      });
    }
  }
}

// Create and export a singleton instance
const searchService = new SearchService();

module.exports = searchService;
