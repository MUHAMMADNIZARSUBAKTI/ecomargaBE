// middleware/auth.js - Authentication and authorization middleware
const jwt = require('jsonwebtoken');
const { loadUsers } = require('../utils/dataHelpers');

/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Token akses diperlukan',
      message: 'Silakan login untuk mengakses resource ini'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Token akses sudah kedaluwarsa, silakan login ulang'
        });
      }
      
      if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({
          error: 'Token tidak valid',
          message: 'Format token tidak benar'
        });
      }

      return res.status(403).json({
        error: 'Token tidak valid',
        message: 'Gagal memverifikasi token'
      });
    }

    // Verify user still exists and is active
    const users = loadUsers();
    const user = users.find(u => u.id === decoded.id);
    
    if (!user) {
      return res.status(403).json({
        error: 'Pengguna tidak ditemukan',
        message: 'User account tidak lagi tersedia'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: 'Akun tidak aktif',
        message: 'Akun Anda telah dinonaktifkan, hubungi administrator'
      });
    }

    // Add user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      nama: user.nama
    };

    next();
  });
};

/**
 * Middleware to authorize admin access only
 */
const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'User tidak terauthentikasi'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Akses ditolak',
      message: 'Hanya admin yang dapat mengakses resource ini'
    });
  }

  next();
};

/**
 * Middleware to authorize specific roles
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'User tidak terauthentikasi'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Akses ditolak',
        message: `Role ${req.user.role} tidak diizinkan mengakses resource ini`
      });
    }

    next();
  };
};

/**
 * Middleware to authorize user access to their own resources
 */
const authorizeOwner = (req, res, next) => {
  const resourceUserId = parseInt(req.params.userId || req.params.id);
  
  if (!req.user) {
    return res.status(401).json({
      error: 'User tidak terauthentikasi'
    });
  }

  // Admin can access any resource
  if (req.user.role === 'admin') {
    return next();
  }

  // User can only access their own resources
  if (req.user.id !== resourceUserId) {
    return res.status(403).json({
      error: 'Akses ditolak',
      message: 'Anda hanya dapat mengakses data milik Anda sendiri'
    });
  }

  next();
};

/**
 * Optional authentication middleware
 * Continues even if no token is provided, but validates if present
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      req.user = null;
    } else {
      const users = loadUsers();
      const user = users.find(u => u.id === decoded.id);
      
      if (user && user.is_active) {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
          nama: user.nama
        };
      } else {
        req.user = null;
      }
    }
    
    next();
  });
};

/**
 * Rate limiting middleware for sensitive operations
 */
const rateLimitSensitive = (req, res, next) => {
  // In a real application, you'd use Redis or similar for rate limiting
  // This is a simple in-memory implementation
  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map();
  }

  const key = `${req.ip}-${req.route.path}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5; // max 5 requests per window

  const requestHistory = global.rateLimitStore.get(key) || [];
  const recentRequests = requestHistory.filter(time => now - time < windowMs);

  if (recentRequests.length >= maxRequests) {
    return res.status(429).json({
      error: 'Terlalu banyak percobaan',
      message: 'Silakan coba lagi dalam 15 menit',
      retry_after: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
    });
  }

  recentRequests.push(now);
  global.rateLimitStore.set(key, recentRequests);
  
  next();
};

/**
 * Middleware to log user activities
 */
const logActivity = (action) => {
  return (req, res, next) => {
    // Store original send function
    const originalSend = res.send;
    
    // Override send function to log after response
    res.send = function(data) {
      // Log activity if request was successful
      if (res.statusCode < 400 && req.user) {
        console.log(`[ACTIVITY] User ${req.user.id} (${req.user.email}) performed: ${action}`, {
          timestamp: new Date().toISOString(),
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          method: req.method,
          path: req.path
        });
        
        // In a real app, you'd save this to a database
        // Example: saveUserActivity(req.user.id, action, req.ip, etc.)
      }
      
      // Call original send function
      originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Middleware to validate API key for certain endpoints
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKeys = process.env.VALID_API_KEYS ? process.env.VALID_API_KEYS.split(',') : [];

  if (!apiKey) {
    return res.status(401).json({
      error: 'API key diperlukan',
      message: 'Header X-API-Key harus disertakan'
    });
  }

  if (!validApiKeys.includes(apiKey)) {
    return res.status(403).json({
      error: 'API key tidak valid'
    });
  }

  next();
};

/**
 * Middleware to check maintenance mode
 */
const checkMaintenanceMode = (req, res, next) => {
  const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';
  
  if (maintenanceMode) {
    // Allow admin access during maintenance
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    
    // Allow health check during maintenance
    if (req.path === '/health') {
      return next();
    }
    
    return res.status(503).json({
      error: 'Sistem dalam maintenance',
      message: 'Aplikasi sedang dalam perbaikan, silakan coba lagi nanti',
      maintenance: true
    });
  }
  
  next();
};

module.exports = {
  authenticateToken,
  authorizeAdmin,
  authorizeRoles,
  authorizeOwner,
  optionalAuth,
  rateLimitSensitive,
  logActivity,
  validateApiKey,
  checkMaintenanceMode
};