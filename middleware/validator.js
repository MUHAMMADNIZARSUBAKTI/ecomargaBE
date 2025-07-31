// middleware/validation.js - Input validation middleware
const { body, query, param, validationResult } = require('express-validator');

// Common validation rules
const commonValidations = {
  email: body('email')
    .isEmail()
    .withMessage('Format email tidak valid')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email maksimal 100 karakter'),
  
  password: body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('Password harus 6-100 karakter')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password harus mengandung huruf besar, huruf kecil, dan angka'),
  
  simplePassword: body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('Password minimal 6 karakter'),
  
  phoneNumber: body('no_telepon')
    .optional({ nullable: true })
    .isMobilePhone('id-ID')
    .withMessage('Nomor telepon tidak valid'),
  
  requiredPhoneNumber: body('no_telepon')
    .isMobilePhone('id-ID')
    .withMessage('Nomor telepon tidak valid'),
  
  name: body('nama')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nama harus 2-100 karakter')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Nama hanya boleh mengandung huruf dan spasi')
    .trim(),
  
  optionalName: body('nama')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nama harus 2-100 karakter')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Nama hanya boleh mengandung huruf dan spasi')
    .trim(),
  
  positiveNumber: (field) => body(field)
    .isFloat({ min: 0.01 })
    .withMessage(`${field} harus berupa angka positif`),
  
  positiveInteger: (field) => body(field)
    .isInt({ min: 1 })
    .withMessage(`${field} harus berupa bilangan bulat positif`),
  
  requiredString: (field, minLength = 1, maxLength = 255) => body(field)
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`${field} wajib diisi (${minLength}-${maxLength} karakter)`)
    .trim(),
  
  optionalString: (field, maxLength = 255) => body(field)
    .optional({ nullable: true })
    .isLength({ max: maxLength })
    .withMessage(`${field} maksimal ${maxLength} karakter`)
    .trim(),
  
  id: param('id')
    .isInt({ min: 1 })
    .withMessage('ID harus berupa bilangan bulat positif'),
  
  latitude: body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude harus antara -90 dan 90'),
  
  longitude: body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude harus antara -180 dan 180'),
  
  date: (field) => body(field)
    .optional()
    .isISO8601()
    .withMessage(`${field} harus berupa tanggal yang valid`),
  
  boolean: (field) => body(field)
    .isBoolean()
    .withMessage(`${field} harus berupa boolean (true/false)`),
  
  optionalBoolean: (field) => body(field)
    .optional()
    .isBoolean()
    .withMessage(`${field} harus berupa boolean (true/false)`),
  
  url: (field) => body(field)
    .optional()
    .isURL()
    .withMessage(`${field} harus berupa URL yang valid`),
  
  array: (field) => body(field)
    .isArray()
    .withMessage(`${field} harus berupa array`),
  
  optionalArray: (field) => body(field)
    .optional()
    .isArray()
    .withMessage(`${field} harus berupa array`)
};

// Query parameter validations
const queryValidations = {
  page: query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page harus berupa bilangan bulat positif'),
  
  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit harus antara 1-100'),
  
  search: query('search')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search minimal 2 karakter'),
  
  sortBy: (allowedFields) => query('sort_by')
    .optional()
    .isIn(allowedFields)
    .withMessage(`Sort by harus salah satu dari: ${allowedFields.join(', ')}`),
  
  sortOrder: query('sort_order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order harus asc atau desc'),
  
  dateRange: [
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('Start date harus berupa tanggal yang valid'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('End date harus berupa tanggal yang valid')
  ],
  
  coordinates: [
    query('lat')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude harus antara -90 dan 90'),
    query('lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude harus antara -180 dan 180'),
    query('radius')
      .optional()
      .isFloat({ min: 1, max: 50 })
      .withMessage('Radius harus antara 1-50 km')
  ]
};

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: 'Data yang dikirim tidak valid',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value,
        location: err.location
      }))
    });
  }
  next();
};

// Specific validation sets for different endpoints
const authValidations = {
  register: [
    commonValidations.name,
    commonValidations.email,
    commonValidations.password,
    commonValidations.phoneNumber,
    commonValidations.optionalString('alamat', 500),
    handleValidationErrors
  ],
  
  login: [
    commonValidations.email,
    commonValidations.simplePassword,
    handleValidationErrors
  ],
  
  forgotPassword: [
    commonValidations.email,
    handleValidationErrors
  ],
  
  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('Token reset password diperlukan'),
    commonValidations.password,
    handleValidationErrors
  ],
  
  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Password saat ini diperlukan'),
    body('newPassword')
      .isLength({ min: 6, max: 100 })
      .withMessage('Password baru minimal 6 karakter')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password harus mengandung huruf besar, huruf kecil, dan angka'),
    handleValidationErrors
  ]
};

const userValidations = {
  updateProfile: [
    commonValidations.optionalName,
    commonValidations.phoneNumber,
    commonValidations.optionalString('alamat', 500),
    handleValidationErrors
  ],
  
  withdrawal: [
    commonValidations.positiveNumber('amount'),
    body('amount')
      .custom((value) => {
        if (value < 50000) {
          throw new Error('Jumlah penarikan minimal Rp 50.000');
        }
        return true;
      }),
    commonValidations.requiredString('bank_name', 2, 50),
    body('account_number')
      .isLength({ min: 10, max: 20 })
      .withMessage('Nomor rekening harus 10-20 digit')
      .isNumeric()
      .withMessage('Nomor rekening hanya boleh angka'),
    commonValidations.requiredString('account_name', 2, 100),
    handleValidationErrors
  ]
};

const submissionValidations = {
  create: [
    commonValidations.positiveInteger('waste_type_id'),
    commonValidations.positiveInteger('bank_sampah_id'),
    body('berat')
      .isFloat({ min: 0.1, max: 1000 })
      .withMessage('Berat sampah harus antara 0.1 - 1000 kg'),
    commonValidations.optionalString('deskripsi', 500),
    handleValidationErrors
  ],
  
  rate: [
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating harus antara 1-5'),
    commonValidations.optionalString('review', 1000),
    handleValidationErrors
  ]
};

const bankSampahValidations = {
  create: [
    commonValidations.requiredString('nama', 2, 100),
    commonValidations.requiredString('alamat', 10, 500),
    commonValidations.requiredString('kota', 2, 50),
    commonValidations.requiredString('provinsi', 2, 50),
    commonValidations.optionalString('kode_pos', 5),
    commonValidations.latitude,
    commonValidations.longitude,
    commonValidations.requiredPhoneNumber,
    body('email')
      .optional()
      .isEmail()
      .withMessage('Format email tidak valid'),
    commonValidations.url('website'),
    commonValidations.optionalString('deskripsi', 1000),
    commonValidations.requiredString('jam_operasional', 5, 100),
    handleValidationErrors
  ],
  
  nearby: [
    ...queryValidations.coordinates,
    handleValidationErrors
  ]
};

const adminValidations = {
  updateSubmissionStatus: [
    body('status')
      .isIn(['pending', 'confirmed', 'picked_up', 'processed', 'completed', 'cancelled', 'rejected'])
      .withMessage('Status tidak valid'),
    commonValidations.optionalString('catatan_admin', 500),
    handleValidationErrors
  ],
  
  updateUserStatus: [
    commonValidations.boolean('is_active'),
    handleValidationErrors
  ],
  
  createWasteType: [
    commonValidations.requiredString('nama', 2, 100),
    commonValidations.requiredString('kategori', 2, 50),
    commonValidations.optionalString('deskripsi', 500),
    commonValidations.positiveNumber('harga_per_kg'),
    body('unit')
      .optional()
      .isIn(['kg', 'pcs', 'liter'])
      .withMessage('Unit harus kg, pcs, atau liter'),
    handleValidationErrors
  ],
  
  broadcastNotification: [
    commonValidations.requiredString('title', 1, 200),
    commonValidations.requiredString('message', 1, 1000),
    body('type')
      .optional()
      .isIn(['system_announcement', 'promotion', 'maintenance'])
      .withMessage('Type tidak valid'),
    commonValidations.optionalArray('target_users'),
    handleValidationErrors
  ]
};

// Custom validation functions
const customValidations = {
  // Check if end date is after start date
  dateRangeCheck: (startField = 'start_date', endField = 'end_date') => {
    return body(endField).custom((endDate, { req }) => {
      const startDate = req.body[startField];
      if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
        throw new Error('Tanggal akhir harus setelah tanggal mulai');
      }
      return true;
    });
  },
  
  // Check if user has sufficient balance
  balanceCheck: (amountField = 'amount') => {
    return body(amountField).custom(async (amount, { req }) => {
      if (req.user) {
        const { User } = require('../models');
        const user = await User.findById(req.user.id);
        if (user.saldo < amount) {
          throw new Error('Saldo tidak mencukupi');
        }
      }
      return true;
    });
  },
  
  // Check if waste type exists
  wasteTypeExists: (field = 'waste_type_id') => {
    return body(field).custom(async (wasteTypeId) => {
      const { WasteType } = require('../models');
      const wasteType = await WasteType.findById(wasteTypeId);
      if (!wasteType || !wasteType.is_active) {
        throw new Error('Jenis sampah tidak valid atau tidak aktif');
      }
      return true;
    });
  },
  
  // Check if bank sampah exists
  bankSampahExists: (field = 'bank_sampah_id') => {
    return body(field).custom(async (bankSampahId) => {
      const { BankSampah } = require('../models');
      const bankSampah = await BankSampah.findById(bankSampahId);
      if (!bankSampah || !bankSampah.is_active) {
        throw new Error('Bank sampah tidak valid atau tidak aktif');
      }
      return true;
    });
  }
};

module.exports = {
  commonValidations,
  queryValidations,
  handleValidationErrors,
  authValidations,
  userValidations,
  submissionValidations,
  bankSampahValidations,
  adminValidations,
  customValidations
};