const rateLimit = require('express-rate-limit');
const { RateLimiterMongo } = require('rate-limiter-flexible');
const mongoose = require('mongoose');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

// Get MongoDB connection
const mongoConn = mongoose.connection;

// Rate limiting options
const rateLimiterOptions = {
  // Basic rate limiting
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  
  // Custom handler
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded', { 
      ip: req.ip,
      path: req.path,
      method: req.method 
    });
    
    next(
      new ErrorResponse(
        options.message, 
        429, // 429 = Too Many Requests
        { 
          retryAfter: Math.ceil(options.windowMs / 1000), // in seconds
          requestCount: req.rateLimit.current,
          limit: req.rateLimit.limit
        }
      )
    );
  }
};

// Create rate limiter for auth routes (stricter limits)
const authLimiter = rateLimit({
  ...rateLimiterOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: 'Too many login attempts, please try again after 15 minutes',
  skipSuccessfulRequests: true // Only count failed requests
});

// Create rate limiter for public API (more lenient)
const apiLimiter = rateLimit({
  ...rateLimiterOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200 // Limit each IP to 200 requests per windowMs
});

// Create rate limiter for sensitive operations (stricter limits)
const sensitiveLimiter = rateLimit({
  ...rateLimiterOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 requests per hour
  message: 'Too many attempts, please try again after an hour'
});

// Advanced rate limiting with MongoDB (for distributed environments)
const mongoRateLimiter = new RateLimiterMongo({
  storeClient: mongoConn,
  points: 100, // Number of points
  duration: 60, // Per 60 seconds
  blockDuration: 300, // Block for 5 minutes if limit exceeded
  keyPrefix: 'rate_limit',
  dbName: process.env.MONGO_DB_NAME || 'civicsense',
  collectionName: 'rateLimits'
});

// Middleware to apply rate limiting with MongoDB
const mongoRateLimit = (req, res, next) => {
  const key = req.user ? req.user.id : req.ip; // Use user ID if authenticated, otherwise IP
  
  mongoRateLimiter.consume(key, 1) // consume 1 point per request
    .then(rateLimiterRes => {
      // Add rate limit headers to response
      res.set({
        'X-RateLimit-Limit': mongoRateLimiter.points,
        'X-RateLimit-Remaining': rateLimiterRes.remainingPoints,
        'X-RateLimit-Reset': new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString()
      });
      
      next();
    })
    .catch(rateLimiterRes => {
      // Calculate retry after in seconds
      const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000);
      
      // Set retry after header
      res.set('Retry-After', retryAfter);
      
      // Log the rate limit hit
      logger.warn('MongoDB rate limit exceeded', { 
        key,
        path: req.path,
        method: req.method,
        retryAfter
      });
      
      next(
        new ErrorResponse(
          'Too many requests, please try again later', 
          429, 
          { retryAfter }
        )
      );
    });
};

// Export the rate limiters
module.exports = {
  authLimiter,
  apiLimiter,
  sensitiveLimiter,
  mongoRateLimit
};
