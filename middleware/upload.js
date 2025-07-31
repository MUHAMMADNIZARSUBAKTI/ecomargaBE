// middleware/upload.js - File upload middleware using multer
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Create upload directories if they don't exist
const uploadDirs = [
  'uploads/avatars', 
  'uploads/submissions', 
  'uploads/bank-sampah',
  'uploads/misc'
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    // Determine upload path based on route
    if (req.route.path.includes('avatar')) {
      uploadPath += 'avatars/';
    } else if (req.route.path.includes('submissions') || req.originalUrl.includes('submissions')) {
      uploadPath += 'submissions/';
    } else if (req.route.path.includes('bank-sampah') || req.originalUrl.includes('bank-sampah')) {
      uploadPath += 'bank-sampah/';
    } else {
      uploadPath += 'misc/';
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const fieldName = file.fieldname || 'file';
    cb(null, fieldName + '-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Tipe file tidak diizinkan. Hanya JPG, JPEG, PNG, GIF, dan WebP yang diperbolehkan.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// File size limits based on file type
const getFileSizeLimit = (req) => {
  if (req.route.path.includes('avatar')) {
    return 2 * 1024 * 1024; // 2MB for avatars
  } else if (req.route.path.includes('submissions')) {
    return 5 * 1024 * 1024; // 5MB for submission photos
  } else if (req.route.path.includes('bank-sampah')) {
    return 3 * 1024 * 1024; // 3MB for bank sampah logos
  }
  return parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // Default 5MB
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Max 10MB, will be checked per route
    files: 10 // Maximum 10 files
  }
});

// Custom middleware to check file size per route
const checkFileSize = (req, res, next) => {
  if (!req.files && !req.file) return next();
  
  const sizeLimit = getFileSizeLimit(req);
  const files = req.files || [req.file];
  
  for (const file of files) {
    if (file && file.size > sizeLimit) {
      // Remove uploaded file if size exceeds limit
      fs.unlink(file.path, (err) => {
        if (err) console.error('Error deleting oversized file:', err);
      });
      
      return res.status(400).json({
        success: false,
        error: 'File terlalu besar',
        message: `Ukuran file maksimal ${(sizeLimit / 1024 / 1024).toFixed(1)}MB`
      });
    }
  }
  
  next();
};

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File terlalu besar',
        message: 'Ukuran file melebihi batas maksimal'
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
  }
  
  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      error: 'Tipe file tidak diizinkan',
      message: err.message
    });
  }
  
  next(err);
};

// Utility function to delete uploaded files (cleanup on error)
const cleanupFiles = (files) => {
  if (!files) return;
  
  const fileArray = Array.isArray(files) ? files : [files];
  
  fileArray.forEach(file => {
    if (file && file.path) {
      fs.unlink(file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
  });
};

// Middleware to process and validate uploaded images
const processImages = (req, res, next) => {
  if (!req.files && !req.file) return next();
  
  // Add file URLs to request for easy access
  if (req.file) {
    req.file.url = `/${req.file.path.replace(/\\/g, '/')}`;
  }
  
  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      file.url = `/${file.path.replace(/\\/g, '/')}`;
    });
  }
  
  next();
};

// Enhanced upload middleware with processing
const uploadWithProcessing = {
  single: (fieldName) => [
    upload.single(fieldName),
    checkFileSize,
    processImages,
    handleMulterError
  ],
  
  array: (fieldName, maxCount = 5) => [
    upload.array(fieldName, maxCount),
    checkFileSize,
    processImages,
    handleMulterError
  ],
  
  fields: (fields) => [
    upload.fields(fields),
    checkFileSize,
    processImages,
    handleMulterError
  ]
};

// Simple upload middleware (backward compatibility)
const simpleUpload = upload;

// Add middleware methods
simpleUpload.handleError = handleMulterError;
simpleUpload.cleanup = cleanupFiles;
simpleUpload.processImages = processImages;
simpleUpload.checkFileSize = checkFileSize;

// Enhanced upload with all processing
simpleUpload.enhanced = uploadWithProcessing;

module.exports = simpleUpload;