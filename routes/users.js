// routes/users.js - User routes
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { authorizeOwner } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Validation rules
const updateProfileValidation = [
  body('nama')
    .optional()
    .notEmpty()
    .withMessage('Nama tidak boleh kosong')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nama harus 2-100 karakter'),
  
  body('no_telepon')
    .optional()
    .isMobilePhone('id-ID')
    .withMessage('Nomor telepon tidak valid'),
  
  body('alamat')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Alamat maksimal 500 karakter')
];

const withdrawalValidation = [
  body('amount')
    .isFloat({ min: 50000 })
    .withMessage('Jumlah penarikan minimal Rp 50.000'),
  
  body('bank_name')
    .notEmpty()
    .withMessage('Nama bank wajib diisi'),
  
  body('account_number')
    .notEmpty()
    .withMessage('Nomor rekening wajib diisi')
    .isLength({ min: 10, max: 20 })
    .withMessage('Nomor rekening harus 10-20 digit'),
  
  body('account_name')
    .notEmpty()
    .withMessage('Nama pemilik rekening wajib diisi')
];

// Routes
router.get('/profile', userController.getUserProfile);
router.put('/profile', updateProfileValidation, userController.updateProfile);
router.post('/profile/avatar', upload.single('avatar'), userController.uploadAvatar);

router.get('/balance', userController.getBalance);
router.get('/balance/history', userController.getBalanceHistory);
router.post('/balance/withdraw', withdrawalValidation, userController.requestWithdrawal);

router.get('/transactions', userController.getTransactions);
router.get('/submissions', userController.getSubmissions);
router.get('/stats', userController.getUserStats);

router.get('/notifications', userController.getNotifications);
router.put('/notifications/:id/read', userController.markNotificationAsRead);
router.put('/notifications/read-all', userController.markAllNotificationsAsRead);

router.get('/leaderboard', userController.getLeaderboardPosition);

router.delete('/account', userController.deleteAccount);

module.exports = router;