// routes/auth.js - Authentication routes
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { rateLimitSensitive } = require('../middleware/auth');

// Validation rules
const registerValidation = [
  body('nama')
    .notEmpty()
    .withMessage('Nama wajib diisi')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nama harus 2-100 karakter')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Nama hanya boleh mengandung huruf dan spasi'),
  
  body('email')
    .isEmail()
    .withMessage('Email tidak valid')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password minimal 6 karakter')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password harus mengandung huruf besar, huruf kecil, dan angka'),
  
  body('no_telepon')
    .optional()
    .isMobilePhone('id-ID')
    .withMessage('Nomor telepon tidak valid'),
  
  body('alamat')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Alamat maksimal 500 karakter')
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Email tidak valid')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password wajib diisi')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('Email tidak valid')
    .normalizeEmail()
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Token reset password diperlukan'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password minimal 6 karakter')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password harus mengandung huruf besar, huruf kecil, dan angka')
];

// Routes
router.post('/register', registerValidation, authController.register);
router.post('/login', rateLimitSensitive, loginValidation, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/forgot-password', rateLimitSensitive, forgotPasswordValidation, authController.forgotPassword);
router.post('/reset-password', rateLimitSensitive, resetPasswordValidation, authController.resetPassword);

module.exports = router;