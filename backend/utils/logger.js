const fs = require('fs');
const path = require('path');

// Ensure log directory exists
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Create a write stream for logging
const accessLogStream = fs.createWriteStream(
  path.join(logDir, 'access.log'),
  { flags: 'a' }
);

const logger = {
  // Log request info
  logRequest: (req, res, next) => {
    const logData = {
      time: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: res.statusCode,
      responseTime: Date.now() - req.startTime
    };
    
    accessLogStream.write(JSON.stringify(logData) + '\n');
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${logData.time}] ${logData.method} ${logData.url} - ${logData.statusCode} (${logData.responseTime}ms)`);
    }
  },
  
  // Log errors
  logError: (err, req, res, next) => {
    const errorLog = {
      time: new Date().toISOString(),
      error: {
        message: err.message,
        stack: err.stack,
        name: err.name
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        params: req.params,
        query: req.query,
        body: req.body,
        ip: req.ip || req.connection.remoteAddress,
        user: req.user ? req.user.id : 'unauthenticated'
      },
      response: {
        statusCode: res.statusCode,
        statusMessage: res.statusMessage
      }
    };
    
    const errorLogStream = fs.createWriteStream(
      path.join(logDir, 'error.log'),
      { flags: 'a' }
    );
    
    errorLogStream.write(JSON.stringify(errorLog) + '\n');
    
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${errorLog.time}] ERROR: ${err.message}`);
      console.error(err.stack);
    }
    
    next(err);
  },
  
  // Log application events
  info: (message, data = {}) => {
    const logEntry = {
      level: 'INFO',
      timestamp: new Date().toISOString(),
      message,
      ...data
    };
    
    const appLogStream = fs.createWriteStream(
      path.join(logDir, 'app.log'),
      { flags: 'a' }
    );
    
    appLogStream.write(JSON.stringify(logEntry) + '\n');
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${logEntry.timestamp}] INFO: ${message}`, data);
    }
  },
  
  error: (message, error = {}) => {
    const logEntry = {
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    };
    
    const appLogStream = fs.createWriteStream(
      path.join(logDir, 'app.log'),
      { flags: 'a' }
    );
    
    appLogStream.write(JSON.stringify(logEntry) + '\n');
    
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${logEntry.timestamp}] ERROR: ${message}`, error);
    }
  },
  
  // Log database operations
  db: (operation, model, query = {}, doc = {}) => {
    const logEntry = {
      level: 'DB',
      timestamp: new Date().toISOString(),
      operation,
      model,
      query,
      doc
    };
    
    const dbLogStream = fs.createWriteStream(
      path.join(logDir, 'db.log'),
      { flags: 'a' }
    );
    
    dbLogStream.write(JSON.stringify(logEntry) + '\n');
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${logEntry.timestamp}] DB ${operation} on ${model}:`, { query, doc });
    }
  }
};

module.exports = logger;
