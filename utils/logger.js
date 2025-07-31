// utils/logger.js - Logging utility
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level from environment
const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

// Color codes for console output
const colors = {
  error: '\x1b[31m', // red
  warn: '\x1b[33m',  // yellow
  info: '\x1b[36m',  // cyan
  debug: '\x1b[37m', // white
  reset: '\x1b[0m'
};

// Format log message
const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
};

// Write to log file
const writeToFile = (level, message, meta = {}) => {
  if (process.env.NODE_ENV === 'test') return; // Don't write files during tests
  
  try {
    const logFile = path.join(logsDir, `${level}.log`);
    const formattedMessage = formatMessage(level, message, meta);
    
    fs.appendFile(logFile, formattedMessage + '\n', (err) => {
      if (err) console.error('Failed to write to log file:', err);
    });
    
    // Also write to general log file
    const generalLogFile = path.join(logsDir, 'app.log');
    fs.appendFile(generalLogFile, formattedMessage + '\n', (err) => {
      if (err) console.error('Failed to write to general log file:', err);
    });
  } catch (error) {
    console.error('Logging error:', error);
  }
};

// Console output with colors
const consoleOutput = (level, message, meta = {}) => {
  if (process.env.NODE_ENV === 'test') return; // Don't log to console during tests
  
  const color = colors[level] || colors.reset;
  const formattedMessage = formatMessage(level, message, meta);
  console.log(`${color}${formattedMessage}${colors.reset}`);
};

// Request logger function
const logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || null
  };
  
  const level = res.statusCode >= 400 ? 'warn' : 'info';
  const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${responseTime}ms`;
  
  logger[level](message, logData);
};

// Error logger function
const logError = (error, req = null, additionalInfo = {}) => {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...additionalInfo
  };
  
  if (req) {
    errorInfo.request = {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || null
    };
  }
  
  logger.error('Application Error', errorInfo);
};

// Performance logger
const logPerformance = (operation, duration, additionalData = {}) => {
  const perfData = {
    operation,
    duration: `${duration}ms`,
    ...additionalData
  };
  
  const level = duration > 1000 ? 'warn' : 'debug'; // Warn if operation takes more than 1 second
  logger[level](`Performance: ${operation} completed in ${duration}ms`, perfData);
};

// Database query logger
const logDatabaseQuery = (query, duration, params = null) => {
  const queryData = {
    query: query.substring(0, 500), // Limit query length in logs
    duration: `${duration}ms`,
    params: params ? JSON.stringify(params).substring(0, 200) : null
  };
  
  const level = duration > 500 ? 'warn' : 'debug'; // Warn if query takes more than 500ms
  logger[level](`Database query completed in ${duration}ms`, queryData);
};

// Security logger
const logSecurityEvent = (event, severity, details = {}) => {
  const securityData = {
    event,
    severity,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  const level = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';
  logger[level](`Security Event: ${event}`, securityData);
};

// Business logic logger
const logBusinessEvent = (event, userId = null, details = {}) => {
  const businessData = {
    event,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  logger.info(`Business Event: ${event}`, businessData);
};

// Logger object
const logger = {
  error: (message, meta = {}) => {
    if (currentLogLevel >= LOG_LEVELS.ERROR) {
      consoleOutput('error', message, meta);
      writeToFile('error', message, meta);
    }
  },
  
  warn: (message, meta = {}) => {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
      consoleOutput('warn', message, meta);
      writeToFile('warn', message, meta);
    }
  },
  
  info: (message, meta = {}) => {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      consoleOutput('info', message, meta);
      writeToFile('info', message, meta);
    }
  },
  
  debug: (message, meta = {}) => {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      consoleOutput('debug', message, meta);
      writeToFile('debug', message, meta);
    }
  },
  
  // Specialized logging methods
  request: logRequest,
  errorWithContext: logError,
  performance: logPerformance,
  database: logDatabaseQuery,
  security: logSecurityEvent,
  business: logBusinessEvent
};

// Override the error method to avoid conflicts
logger.error = (message, meta = {}) => {
  if (currentLogLevel >= LOG_LEVELS.ERROR) {
    consoleOutput('error', message, meta);
    writeToFile('error', message, meta);
  }
};

// Log rotation (simple implementation)
const rotateLog = (filename) => {
  const filePath = path.join(logsDir, filename);
  const rotatePath = path.join(logsDir, `${filename}.${Date.now()}`);
  
  fs.stat(filePath, (err, stats) => {
    if (err) return; // File doesn't exist
    
    // Rotate if file is larger than 10MB
    if (stats.size > 10 * 1024 * 1024) {
      fs.rename(filePath, rotatePath, (renameErr) => {
        if (renameErr) {
          console.error('Failed to rotate log file:', renameErr);
        } else {
          logger.info(`Log file rotated: ${filename}`);
        }
      });
    }
  });
};

// Clean old log files (keep last 30 days)
const cleanOldLogs = () => {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  fs.readdir(logsDir, (err, files) => {
    if (err) return;
    
    files.forEach(file => {
      if (file.includes('.') && !file.endsWith('.log')) {
        const filePath = path.join(logsDir, file);
        fs.stat(filePath, (statErr, stats) => {
          if (!statErr && stats.mtime.getTime() < thirtyDaysAgo) {
            fs.unlink(filePath, (unlinkErr) => {
              if (!unlinkErr) {
                logger.info(`Old log file deleted: ${file}`);
              }
            });
          }
        });
      }
    });
  });
};

// Structured logger for different contexts
const createContextLogger = (context) => {
  return {
    error: (message, meta = {}) => logger.error(message, { context, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { context, ...meta }),
    info: (message, meta = {}) => logger.info(message, { context, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { context, ...meta })
  };
};

// Log stream for external libraries
const logStream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Initialize log rotation and cleanup on startup
const initializeLogging = () => {
  // Rotate logs if they're too large
  ['app.log', 'error.log', 'warn.log', 'info.log', 'debug.log'].forEach(rotateLog);
  
  // Clean old logs
  cleanOldLogs();
  
  // Set up periodic cleanup (every 24 hours)
  setInterval(cleanOldLogs, 24 * 60 * 60 * 1000);
  
  logger.info('Logging system initialized');
};

// Middleware for request logging
const requestLoggingMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Log request start
  logger.debug(`Incoming ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });
  
  // Override res.end to capture response
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - start;
    logRequest(req, res, duration);
    originalEnd.apply(this, args);
  };
  
  next();
};

// Error handling middleware for logging
const errorLoggingMiddleware = (error, req, res, next) => {
  logError(error, req);
  next(error); // Pass error to next middleware
};

module.exports = logger;

// Also export utility functions
module.exports.createContextLogger = createContextLogger;
module.exports.logStream = logStream;
module.exports.initializeLogging = initializeLogging;
module.exports.requestLoggingMiddleware = requestLoggingMiddleware;
module.exports.errorLoggingMiddleware = errorLoggingMiddleware;
module.exports.rotateLog = rotateLog;
module.exports.cleanOldLogs = cleanOldLogs;