// middleware/rateLimiter.js - Rate limiting middleware
const rateLimit = require('express-rate-limit');

// Basic rate limiter for general API endpoints
const basicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Terlalu banyak request',
    message: 'Anda telah mencapai batas maksimal request. Coba lagi dalam 15 menit.',
    retry_after: '15 minutes'
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api';
  }
});

// Strict rate limiter for sensitive operations
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    error: 'Terlalu banyak percobaan',
    message: 'Terlalu banyak percobaan untuk operasi sensitif. Coba lagi dalam 15 menit.',
    retry_after: '15 minutes'
  }
});

// Auth-specific rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    success: false,
    error: 'Terlalu banyak percobaan login',
    message: 'Terlalu banyak percobaan login gagal. Coba lagi dalam 15 menit.',
    retry_after: '15 minutes'
  },
  // Custom key generator to include user identifier if available
  keyGenerator: (req) => {
    return req.body?.email || req.ip;
  }
});

// Create submission rate limiter
const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Max 20 submissions per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Terlalu banyak submission',
    message: 'Anda telah mencapai batas maksimal submission per jam. Coba lagi nanti.',
    retry_after: '1 hour'
  },
  // Use user ID if authenticated, otherwise IP
  keyGenerator: (req) => {
    return req.user?.id ? `user_${req.user.id}` : req.ip;
  }
});

// Password reset rate limiter
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 password reset attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Terlalu banyak permintaan reset password',
    message: 'Anda telah mencapai batas maksimal permintaan reset password per jam.',
    retry_after: '1 hour'
  },
  keyGenerator: (req) => {
    return req.body?.email || req.ip;
  }
});

// File upload rate limiter
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Max 30 file uploads per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Terlalu banyak upload file',
    message: 'Anda telah mencapai batas maksimal upload file. Coba lagi dalam 15 menit.',
    retry_after: '15 minutes'
  },
  keyGenerator: (req) => {
    return req.user?.id ? `user_${req.user.id}` : req.ip;
  }
});

// Admin operations rate limiter
const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Max 50 admin operations per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Terlalu banyak operasi admin',
    message: 'Anda telah mencapai batas maksimal operasi admin. Coba lagi dalam 5 menit.',
    retry_after: '5 minutes'
  },
  keyGenerator: (req) => {
    return req.user?.id ? `admin_${req.user.id}` : req.ip;
  }
});

// Search rate limiter
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Max 30 searches per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Terlalu banyak pencarian',
    message: 'Anda telah mencapai batas maksimal pencarian per menit.',
    retry_after: '1 minute'
  }
});

// Email sending rate limiter
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 emails per hour per IP/user
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Terlalu banyak email',
    message: 'Anda telah mencapai batas maksimal pengiriman email per jam.',
    retry_after: '1 hour'
  },
  keyGenerator: (req) => {
    return req.body?.email || req.user?.email || req.ip;
  }
});

// API key rate limiter (for external integrations)
const apiKeyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Max 1000 requests per hour per API key
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'API rate limit exceeded',
    message: 'API key has exceeded the hourly rate limit.',
    retry_after: '1 hour'
  },
  keyGenerator: (req) => {
    return req.headers['x-api-key'] || req.ip;
  }
});

// Dynamic rate limiter based on user role
const dynamicLimiter = (userLimits = {}) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: (req) => {
      const userRole = req.user?.role || 'guest';
      return userLimits[userRole] || userLimits.default || 100;
    },
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'Rate limit exceeded',
      message: 'You have exceeded the rate limit for your user role.',
      retry_after: '15 minutes'
    },
    keyGenerator: (req) => {
      return req.user?.id ? `${req.user.role}_${req.user.id}` : req.ip;
    }
  });
};

// Create rate limiter with custom options
const createCustomLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'Rate limit exceeded',
      message: 'Too many requests, please try again later.',
      retry_after: Math.ceil(options.windowMs / 60000) + ' minutes'
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

// Rate limiter store (for Redis integration in production)
const createRedisStore = () => {
  // This would be implemented with Redis in production
  // For now, using default memory store
  console.log('Using memory store for rate limiting. Consider Redis for production.');
  return undefined; // Uses default memory store
};

module.exports = {
  basicLimiter,
  strictLimiter,
  authLimiter,
  submissionLimiter,
  passwordResetLimiter,
  uploadLimiter,
  adminLimiter,
  searchLimiter,
  emailLimiter,
  apiKeyLimiter,
  dynamicLimiter,
  createCustomLimiter,
  createRedisStore
};