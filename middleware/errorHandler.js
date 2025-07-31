// middleware/errorHandler.js - Error handling middleware
const logger = require('../utils/logger');

/**
 * Development error handler - shows detailed error information
 */
const developmentErrorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  
  logger.error('Development Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user ? req.user.id : 'anonymous'
  });

  res.status(statusCode).json({
    success: false,
    error: err.name || 'Error',
    message: err.message,
    stack: err.stack,
    details: {
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Production error handler - shows limited error information
 */
const productionErrorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  
  logger.error('Production Error:', {
    message: err.message,
    url: req.url,
    method: req.method,
    ip: req.ip,
    user: req.user ? req.user.id : 'anonymous'
  });

  // Don't leak error details in production
  const message = statusCode >= 500 ? 'Terjadi kesalahan server' : err.message;

  res.status(statusCode).json({
    success: false,
    error: 'Error',
    message,
    timestamp: new Date().toISOString()
  });
};

/**
 * Handle specific error types
 */
const handleSpecificErrors = (err, req, res, next) => {
  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token tidak valid',
      message: 'Silakan login ulang'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      message: 'Silakan login ulang'
    });
  }

  // Validation Errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Data yang dikirim tidak valid',
      details: err.details || err.message
    });
  }

  // Database Errors
  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      success: false,
      error: 'Data sudah ada',
      message: 'Data dengan nilai tersebut sudah ada dalam database'
    });
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    return res.status(400).json({
      success: false,
      error: 'Referensi tidak valid',
      message: 'Data yang direferensikan tidak ditemukan'
    });
  }

  if (err.code === '23502') { // PostgreSQL not null violation
    return res.status(400).json({
      success: false,
      error: 'Data wajib tidak lengkap',
      message: 'Semua field wajib harus diisi'
    });
  }

  // Multer Errors (File Upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File terlalu besar',
      message: `Ukuran file maksimal ${(parseInt(process.env.MAX_FILE_SIZE) || 5242880) / 1024 / 1024}MB`
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      error: 'Terlalu banyak file',
      message: 'Maksimal 10 file dapat diupload sekaligus'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Field file tidak dikenali',
      message: 'Periksa nama field untuk upload file'
    });
  }

  // CORS Errors
  if (err.message && err.message.includes('CORS policy')) {
    return res.status(403).json({
      success: false,
      error: 'CORS Error',
      message: 'Origin tidak diizinkan'
    });
  }

  // Rate Limit Errors
  if (err.statusCode === 429) {
    return res.status(429).json({
      success: false,
      error: 'Terlalu banyak request',
      message: 'Anda telah mencapai batas maksimal request'
    });
  }

  // Continue to next error handler
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
      const { closeConnection } = require('../config/database');
      closeConnection().then(() => {
        console.log('Graceful shutdown complete.');
        process.exit(0);
      }).catch((error) => {
        console.error('Error during database cleanup:', error);
        process.exit(1);
      });
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };

  // Handle different shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    shutdown('UNCAUGHT_EXCEPTION');
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('UNHANDLED_REJECTION');
  });
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  gracefulShutdown,
  developmentErrorHandler,
  productionErrorHandler
};