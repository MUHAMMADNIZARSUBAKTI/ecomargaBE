// utils/helpers.js - Utility helper functions

/**
 * Get pagination information
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} totalCount - Total number of items
 * @returns {object} Pagination info
 */
const getPaginationInfo = (page, limit, totalCount) => {
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
    current_page: page,
    per_page: limit,
    total_items: totalCount,
    total_pages: totalPages,
    has_next_page: hasNextPage,
    has_prev_page: hasPrevPage,
    next_page: hasNextPage ? page + 1 : null,
    prev_page: hasPrevPage ? page - 1 : null
  };
};

/**
 * Format currency to IDR
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Format weight with unit
 * @param {number} weight - Weight in kg
 * @returns {string} Formatted weight
 */
const formatWeight = (weight) => {
  if (weight >= 1000) {
    return `${(weight / 1000).toFixed(1)} ton`;
  } else if (weight >= 1) {
    return `${weight.toFixed(1)} kg`;
  } else {
    return `${(weight * 1000).toFixed(0)} gram`;
  }
};

/**
 * Generate random string
 * @param {number} length - Length of string
 * @returns {string} Random string
 */
const generateRandomString = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate Indonesian phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Is valid phone number
 */
const isValidPhoneNumber = (phone) => {
  // Indonesian phone number format: +62xxx, 08xxx, or 62xxx
  const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};

/**
 * Sanitize filename for upload
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
const sanitizeFilename = (filename) => {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Degrees to convert
 * @returns {number} Radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Format date to Indonesian locale
 * @param {Date} date - Date to format
 * @param {object} options - Intl formatting options
 * @returns {string} Formatted date
 */
const formatDate = (date, options = {}) => {
  const defaultOptions = {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return new Intl.DateTimeFormat('id-ID', { ...defaultOptions, ...options }).format(new Date(date));
};

/**
 * Get time ago string in Indonesian
 * @param {Date} date - Date to compare
 * @returns {string} Time ago string
 */
const getTimeAgo = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
  
  const intervals = [
    { label: 'tahun', seconds: 31536000 },
    { label: 'bulan', seconds: 2592000 },
    { label: 'minggu', seconds: 604800 },
    { label: 'hari', seconds: 86400 },
    { label: 'jam', seconds: 3600 },
    { label: 'menit', seconds: 60 },
    { label: 'detik', seconds: 1 }
  ];
  
  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count > 0) {
      return `${count} ${interval.label} yang lalu`;
    }
  }
  
  return 'baru saja';
};

/**
 * Generate submission code
 * @returns {string} Unique submission code
 */
const generateSubmissionCode = () => {
  const prefix = 'SUB';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = generateRandomString(4);
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Generate transaction code
 * @returns {string} Unique transaction code
 */
const generateTransactionCode = () => {
  const prefix = 'TRX';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = generateRandomString(4);
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Validate and sanitize pagination parameters
 * @param {object} query - Query parameters
 * @returns {object} Sanitized pagination params
 */
const sanitizePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit) || 10));
  
  return { page, limit };
};

/**
 * Deep clone object
 * @param {object} obj - Object to clone
 * @returns {object} Cloned object
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Remove sensitive fields from user object
 * @param {object} user - User object
 * @returns {object} Sanitized user object
 */
const sanitizeUser = (user) => {
  const { password, refresh_token, ...sanitizedUser } = user;
  return sanitizedUser;
};

/**
 * Convert string to slug
 * @param {string} text - Text to convert
 * @returns {string} Slug
 */
const slugify = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Capitalize first letter of each word
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text
 */
const capitalizeWords = (text) => {
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Check if file is image
 * @param {string} filename - Filename to check
 * @returns {boolean} Is image file
 */
const isImageFile = (filename) => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return imageExtensions.includes(ext);
};

/**
 * Get file extension
 * @param {string} filename - Filename
 * @returns {string} File extension
 */
const getFileExtension = (filename) => {
  return filename.toLowerCase().substring(filename.lastIndexOf('.'));
};

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

module.exports = {
  getPaginationInfo,
  formatCurrency,
  formatWeight,
  generateRandomString,
  isValidEmail,
  isValidPhoneNumber,
  sanitizeFilename,
  calculateDistance,
  toRadians,
  formatDate,
  getTimeAgo,
  generateSubmissionCode,
  generateTransactionCode,
  sanitizePagination,
  deepClone,
  sanitizeUser,
  slugify,
  capitalizeWords,
  isImageFile,
  getFileExtension,
  formatFileSize
};