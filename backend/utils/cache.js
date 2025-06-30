const NodeCache = require('node-cache');
const logger = require('./logger');

// Default TTL (Time To Live) in seconds
const DEFAULT_TTL = 60 * 10; // 10 minutes
const DEFAULT_CHECK_PERIOD = 60 * 5; // 5 minutes

class Cache {
  constructor(ttl = DEFAULT_TTL, checkPeriod = DEFAULT_CHECK_PERIOD) {
    this.cache = new NodeCache({
      stdTTL: ttl,
      checkperiod: checkPeriod,
      useClones: false, // Disable cloning for better performance with objects
      deleteOnExpire: true, // Automatically remove expired items
      maxKeys: -1 // Unlimited keys
    });

    // Log cache statistics periodically
    setInterval(() => {
      const stats = this.cache.getStats();
      logger.debug('Cache statistics', stats);
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined if not found
   */
  get(key) {
    try {
      return this.cache.get(key);
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      return undefined;
    }
  }

  /**
   * Set a value in the cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} [ttl] - Time to live in seconds (optional)
   * @returns {boolean} True if successful
   */
  set(key, value, ttl) {
    try {
      const options = ttl ? { ttl } : undefined;
      return this.cache.set(key, value, options);
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete a value from the cache
   * @param {string|string[]} key - Cache key or array of keys
   * @returns {number} Number of deleted keys
   */
  del(key) {
    try {
      return this.cache.del(key);
    } catch (error) {
      logger.error('Cache delete error', { key, error: error.message });
      return 0;
    }
  }

  /**
   * Clear the entire cache
   * @returns {void}
   */
  flush() {
    try {
      this.cache.flushAll();
    } catch (error) {
      logger.error('Cache flush error', { error: error.message });
    }
  }

  /**
   * Get multiple values from the cache
   * @param {string[]} keys - Array of cache keys
   * @returns {Object} Object with keys and their values
   */
  mget(keys) {
    try {
      return this.cache.mget(keys);
    } catch (error) {
      logger.error('Cache mget error', { keys, error: error.message });
      return {};
    }
  }

  /**
   * Set multiple values in the cache
   * @param {Object} keyValueMap - Object with key-value pairs
   * @param {number} [ttl] - Time to live in seconds (optional)
   * @returns {boolean} True if successful
   */
  mset(keyValueMap, ttl) {
    try {
      const options = ttl ? { ttl } : undefined;
      return this.cache.mset(keyValueMap, options);
    } catch (error) {
      logger.error('Cache mset error', { error: error.message });
      return false;
    }
  }

  /**
   * Check if a key exists in the cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Get all keys in the cache
   * @returns {string[]} Array of cache keys
   */
  keys() {
    return this.cache.keys();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Wrap a function with caching
   * @param {string} key - Cache key
   * @param {Function} work - Function to execute if cache miss
   * @param {number} [ttl] - Time to live in seconds (optional)
   * @returns {Promise<*>} Cached or computed value
   */
  async wrap(key, work, ttl) {
    try {
      // Try to get from cache first
      const cachedValue = this.get(key);
      if (cachedValue !== undefined) {
        logger.debug('Cache hit', { key });
        return cachedValue;
      }

      logger.debug('Cache miss', { key });
      
      // If not in cache, execute the work function
      const result = await work();
      
      // Store the result in cache
      if (result !== undefined) {
        this.set(key, result, ttl);
      }
      
      return result;
    } catch (error) {
      logger.error('Cache wrap error', { key, error: error.message });
      // In case of error, still try to execute the work function
      return await work();
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   * @param {string} pattern - Pattern to match keys against
   * @returns {number} Number of keys deleted
   */
  invalidatePattern(pattern) {
    try {
      const keys = this.keys();
      const regex = new RegExp(pattern);
      const keysToDelete = keys.filter(key => regex.test(key));
      
      if (keysToDelete.length > 0) {
        return this.del(keysToDelete);
      }
      
      return 0;
    } catch (error) {
      logger.error('Cache invalidatePattern error', { pattern, error: error.message });
      return 0;
    }
  }
}

// Create a default cache instance
const cache = new Cache();

// Export both the instance and the class
module.exports = {
  cache,
  Cache
};
