// middleware/errorHandler.js - Global error handling middleware
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Log error to file
 */
const logError = (error, req) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    },
    user: req.user || null
  };

  const logString = JSON.stringify(logEntry, null, 2) + '\n';
  const logFile = path.join(logsDir, `error-${new Date().toISOString().split('T')[0]}.log`);
  
  fs.appendFileSync(logFile, logString);
};

/**
 * Development error handler - shows full error details
 */
const developmentErrorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    user: req.user
  });

  // Log error to file
  logError(err, req);

  res.status(status).json({
    error: err.message || 'Internal Server Error',
    stack: err.stack,
    details: {
      name: err.name,
      status,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    }
  });
};

/**
 * Production error handler - shows minimal error details
 */
const productionErrorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  
  // Log error to file (but not to console in production)
  logError(err, req);

  // Don't leak error details in production
  const message = status < 500 ? err.message : 'Terjadi kesalahan pada server';
  
  res.status(status).json({
    error: message,
    timestamp: new Date().toISOString(),
    requestId: req.id || Math.random().toString(36).substr(2, 9)
  });
};

/**
 * Handle specific error types
 */
const handleSpecificErrors = (err, req, res, next) => {
  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token tidak valid',
      message: 'Silakan login ulang'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token sudah kedaluwarsa',
      message: 'Silakan login ulang'
    });
  }

  // Validation Errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Data tidak valid',
      details: err.details || err.message
    });
  }

  // Multer Errors (File Upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File terlalu besar',
      message: 'Ukuran file maksimal 5MB'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      error: 'Terlalu banyak file',
      message: 'Maksimal 5 file dapat diupload'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Field file tidak dikenal',
      message: 'Pastikan nama field file sesuai dengan yang diharapkan'
    });
  }

  // Database/File System Errors
  if (err.code === 'ENOENT') {
    return res.status(404).json({
      error: 'File tidak ditemukan',
      message: 'Resource yang diminta tidak tersedia'
    });
  }

  if (err.code === 'EACCES') {
    return res.status(500).json({
      error: 'Tidak ada akses ke file',
      message: 'Terjadi kesalahan server'
    });
  }

  // Rate Limiting Errors
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Terlalu banyak request',
      message: 'Silakan tunggu beberapa saat sebelum mencoba lagi',
      retryAfter: err.retryAfter || 900 // 15 minutes default
    });
  }

  // Continue to general error handler
  next(err);
};

/**
 * Handle async errors in routes
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} tidak ditemukan`);
  error.status = 404;
  next(error);
};

/**
 * Main error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Handle specific error types first
  handleSpecificErrors(err, req, res, (err) => {
    if (!err) return; // Error was handled by specific handler
    
    // Use development or production error handler based on environment
    if (process.env.NODE_ENV === 'production') {
      productionErrorHandler(err, req, res, next);
    } else {
      developmentErrorHandler(err, req, res, next);
    }
  });
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = (server) => {
  const shutdown = (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    server.close((err) => {
      if (err) {
        console.error('Error during graceful shutdown:', err);
        process.exit(1);
      }
      
      console.log('HTTP server closed.');
      
      // Close database connections, cleanup, etc.
      // In this case, we're using file-based storage, so no cleanup needed
      
      console.log('Graceful shutdown complete.');
      process.exit(0);
    });
    
    // Force close server after 30 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };

  // Listen for termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  
  // Log to file
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: 'uncaughtException',
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    }
  };
  
  const logString = JSON.stringify(logEntry, null, 2) + '\n';
  const logFile = path.join(logsDir, `uncaught-${new Date().toISOString().split('T')[0]}.log`);
  
  try {
    fs.appendFileSync(logFile, logString);
  } catch (logErr) {
    console.error('Failed to log uncaught exception:', logErr);
  }
  
  // In production, you might want to restart the process
  if (process.env.NODE_ENV === 'production') {
    console.log('Process will restart in 1 second...');
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  } else {
    process.exit(1);
  }
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Log to file
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: 'unhandledRejection',
    reason: reason?.message || reason,
    stack: reason?.stack
  };
  
  const logString = JSON.stringify(logEntry, null, 2) + '\n';
  const logFile = path.join(logsDir, `unhandled-${new Date().toISOString().split('T')[0]}.log`);
  
  try {
    fs.appendFileSync(logFile, logString);
  } catch (logErr) {
    console.error('Failed to log unhandled rejection:', logErr);
  }
  
  // Don't exit the process for unhandled rejections in development
  if (process.env.NODE_ENV === 'production') {
    console.log('Process will restart in 1 second...');
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
});

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  gracefulShutdown,
  developmentErrorHandler,
  productionErrorHandler
};