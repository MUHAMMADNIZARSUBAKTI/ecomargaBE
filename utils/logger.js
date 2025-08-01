// utils/logger.js - Logging utility
const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    };

    return JSON.stringify(logEntry) + '\n';
  }

  writeToFile(filename, content) {
    const filePath = path.join(this.logDir, filename);
    
    try {
      fs.appendFileSync(filePath, content);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  log(level, message, meta = {}) {
    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Write to console in development
    if (process.env.NODE_ENV === 'development') {
      const consoleMessage = `[${new Date().toISOString()}] ${level.toUpperCase()}: ${message}`;
      
      switch (level) {
        case 'error':
          console.error(consoleMessage, meta);
          break;
        case 'warn':
          console.warn(consoleMessage, meta);
          break;
        case 'info':
          console.info(consoleMessage, meta);
          break;
        default:
          console.log(consoleMessage, meta);
      }
    }

    // Write to file
    const today = new Date().toISOString().split('T')[0];
    const filename = `app-${today}.log`;
    this.writeToFile(filename, formattedMessage);

    // Write errors to separate file
    if (level === 'error') {
      const errorFilename = `error-${today}.log`;
      this.writeToFile(errorFilename, formattedMessage);
    }
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      this.log('debug', message, meta);
    }
  }

  // Log HTTP requests
  logRequest(req, res, responseTime) {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user?.id || null
    };

    const level = res.statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `HTTP ${req.method} ${req.originalUrl}`, logData);
  }

  // Log database queries (if needed)
  logQuery(sql, bindings, duration) {
    if (process.env.DEBUG_SQL === 'true') {
      this.debug('Database Query', {
        sql,
        bindings,
        duration: `${duration}ms`
      });
    }
  }

  // Log authentication events
  logAuth(event, userId, details = {}) {
    this.info(`Auth: ${event}`, {
      userId,
      ...details
    });
  }

  // Log business events
  logBusiness(event, details = {}) {
    this.info(`Business: ${event}`, details);
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;