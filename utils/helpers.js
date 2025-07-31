// utils/helpers.js - Helper utility functions
const crypto = require('crypto');
const path = require('path');

// Generate random string
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate UUID v4
const generateUUID = () => {
  return crypto.randomUUID();
};

// Format currency (Indonesian Rupiah)
const formatCurrency = (amount, options = {}) => {
  const defaultOptions = {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  };
  
  return new Intl.NumberFormat('id-ID', { ...defaultOptions, ...options }).format(amount);
};

// Format number with Indonesian locale
const formatNumber = (number, options = {}) => {
  return new Intl.NumberFormat('id-ID', options).format(number);
};

// Format date (Indonesian)
const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Jakarta'
  };
  
  return new Intl.DateTimeFormat('id-ID', { ...defaultOptions, ...options }).format(new Date(date));
};

// Format datetime (Indonesian)
const formatDateTime = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  };
  
  return new Intl.DateTimeFormat('id-ID', { ...defaultOptions, ...options }).format(new Date(date));
};

// Format time only
const formatTime = (date, options = {}) => {
  const defaultOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta'
  };
  
  return new Intl.DateTimeFormat('id-ID', { ...defaultOptions, ...options }).format(new Date(date));
};

// Get relative time (e.g., "2 jam yang lalu")
const getRelativeTime = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Baru saja';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} menit yang lalu`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} jam yang lalu`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} hari yang lalu`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} minggu yang lalu`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} bulan yang lalu`;
  }
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} tahun yang lalu`;
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

// Validate file type
const isValidFileType = (filename, allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp']) => {
  const ext = path.extname(filename).toLowerCase().slice(1);
  return allowedTypes.includes(ext);
};

// Get file extension
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

// Sanitize filename
const sanitizeFilename = (filename) => {
  // Remove or replace unsafe characters
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
};

// Generate pagination info
const getPaginationInfo = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total: parseInt(total),
    totalPages,
    hasNext,
    hasPrev,
    prevPage: hasPrev ? page - 1 : null,
    nextPage: hasNext ? page + 1 : null
  };
};

// Validate Indonesian phone number
const validatePhoneNumber = (phoneNumber) => {
  const regex = /^(\+62|62|0)8[1-9][0-9]{6,11}$/;
  return regex.test(phoneNumber.replace(/\s|-/g, ''));
};

// Format Indonesian phone number
const formatPhoneNumber = (phoneNumber) => {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Convert to standard format
  if (cleaned.startsWith('62')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    return '+62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    return '+62' + cleaned;
  }
  
  return phoneNumber; // Return original if can't format
};

// Sleep function for delays
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Deep clone object
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

// Remove sensitive fields from user object
const sanitizeUser = (user) => {
  if (!user) return null;
  
  const sanitized = { ...user };
  delete sanitized.password;
  delete sanitized.password_reset_token;
  delete sanitized.email_verification_token;
  return sanitized;
};

// Calculate environmental impact
const calculateEnvironmentalImpact = (totalWeight, factors = {}) => {
  const defaultFactors = {
    co2_factor: 2.3,    // kg CO2 per kg waste
    energy_factor: 1.5, // kWh per kg waste
    water_factor: 10    // liters per kg waste
  };
  
  const usedFactors = { ...defaultFactors, ...factors };
  
  return {
    co2_saved: Math.round(totalWeight * usedFactors.co2_factor * 100) / 100,
    energy_saved: Math.round(totalWeight * usedFactors.energy_factor * 100) / 100,
    water_saved: Math.round(totalWeight * usedFactors.water_factor * 100) / 100
  };
};

// Slugify string for URLs
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

// Capitalize first letter
const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Title case
const toTitleCase = (str) => {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

// Parse JSON safely
const safeJsonParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return defaultValue;
  }
};

// Get file size in human readable format
const formatFileSize = (bytes, si = false, dp = 1) => {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10**dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

  return bytes.toFixed(dp) + ' ' + units[u];
};

// Truncate string with ellipsis
const truncate = (str, length = 100, ending = '...') => {
  if (str.length > length) {
    return str.substring(0, length - ending.length) + ending;
  }
  return str;
};

// Generate random integer between min and max (inclusive)
const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Generate random float between min and max
const randomFloat = (min, max, decimals = 2) => {
  const result = Math.random() * (max - min) + min;
  return Math.round(result * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// Check if value is empty (null, undefined, empty string, empty array, empty object)
const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  return false;
};

// Debounce function
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// Throttle function
const throttle = (func, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Group array of objects by key
const groupBy = (array, key) => {
  return array.reduce((result, currentValue) => {
    (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
    return result;
  }, {});
};

// Get unique values from array
const unique = (array) => {
  return [...new Set(array)];
};

// Sort array of objects by multiple keys
const sortBy = (array, ...keys) => {
  return array.sort((a, b) => {
    for (let key of keys) {
      let order = 1;
      if (key.startsWith('-')) {
        order = -1;
        key = key.slice(1);
      }
      
      if (a[key] < b[key]) return -1 * order;
      if (a[key] > b[key]) return 1 * order;
    }
    return 0;
  });
};

// Convert bytes to different units
const convertBytes = (bytes, unit) => {
  const units = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024
  };
  
  return bytes / (units[unit.toUpperCase()] || 1);
};

// Mask sensitive data (like credit card, phone numbers)
const maskSensitiveData = (data, visibleChars = 4, maskChar = '*') => {
  if (!data || data.length <= visibleChars) return data;
  
  const visible = data.slice(-visibleChars);
  const masked = maskChar.repeat(data.length - visibleChars);
  
  return masked + visible;
};

// Generate color from string (for avatars, etc.)
const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const color = Math.floor(Math.abs((Math.sin(hash) * 16777215) % 1) * 16777215).toString(16);
  return '#' + Array(6 - color.length + 1).join('0') + color;
};

module.exports = {
  generateRandomString,
  generateUUID,
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  formatTime,
  getRelativeTime,
  calculateDistance,
  isValidFileType,
  getFileExtension,
  sanitizeFilename,
  getPaginationInfo,
  validatePhoneNumber,
  formatPhoneNumber,
  sleep,
  deepClone,
  sanitizeUser,
  calculateEnvironmentalImpact,
  slugify,
  capitalize,
  toTitleCase,
  safeJsonParse,
  formatFileSize,
  truncate,
  randomInt,
  randomFloat,
  isEmpty,
  debounce,
  throttle,
  groupBy,
  unique,
  sortBy,
  convertBytes,
  maskSensitiveData,
  stringToColor
};