// routes/admin.js - Admin routes
const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const adminController = require('../controllers/adminController');
const upload = require('../middleware/upload');

// Validation rules
const createBankSampahValidation = [
  body('nama')
    .notEmpty()
    .withMessage('Nama bank sampah wajib diisi')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nama harus 2-100 karakter'),
  
  body('alamat')
    .notEmpty()
    .withMessage('Alamat wajib diisi')
    .isLength({ min: 10, max: 500 })
    .withMessage('Alamat harus 10-500 karakter'),
  
  body('kota')
    .notEmpty()
    .withMessage('Kota wajib diisi'),
  
  body('provinsi')
    .notEmpty()
    .withMessage('Provinsi wajib diisi'),
  
  body('no_telepon')
    .isMobilePhone('id-ID')
    .withMessage('Nomor telepon tidak valid'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email tidak valid'),
  
  body('jam_operasional')
    .notEmpty()
    .withMessage('Jam operasional wajib diisi'),
  
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude harus antara -90 dan 90'),
  
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude harus antara -180 dan 180')
];

const updateSubmissionStatusValidation = [
  body('status')
    .isIn(['pending', 'confirmed', 'picked_up', 'processed', 'completed', 'cancelled', 'rejected'])
    .withMessage('Status tidak valid'),
  
  body('catatan_admin')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Catatan admin maksimal 500 karakter')
];

const updateUserStatusValidation = [
  body('is_active')
    .isBoolean()
    .withMessage('Status aktif harus berupa boolean')
];

const dateRangeValidation = [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Format tanggal mulai tidak valid'),
  
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('Format tanggal akhir tidak valid')
];

// Dashboard & Statistics
router.get('/dashboard', adminController.getDashboard);
router.get('/stats/overview', dateRangeValidation, adminController.getOverviewStats);
router.get('/stats/users', dateRangeValidation, adminController.getUserStats);
router.get('/stats/submissions', dateRangeValidation, adminController.getSubmissionStats);
router.get('/stats/revenue', dateRangeValidation, adminController.getRevenueStats);
router.get('/stats/environmental', adminController.getEnvironmentalStats);

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id/status', updateUserStatusValidation, adminController.updateUserStatus);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/:id/bonus', 
  body('amount').isFloat({ min: 1000 }).withMessage('Bonus minimal Rp 1.000'),
  body('description').notEmpty().withMessage('Deskripsi bonus wajib diisi'),
  adminController.giveUserBonus
);

// Submission Management
router.get('/submissions', adminController.getAllSubmissions);
router.get('/submissions/:id', adminController.getSubmissionById);
router.put('/submissions/:id/status', updateSubmissionStatusValidation, adminController.updateSubmissionStatus);
router.put('/submissions/:id/approve', adminController.approveSubmission);
router.put('/submissions/:id/reject', 
  body('reason').notEmpty().withMessage('Alasan penolakan wajib diisi'),
  adminController.rejectSubmission
);

// Bank Sampah Management
router.get('/bank-sampah', adminController.getAllBankSampahAdmin);
router.post('/bank-sampah', createBankSampahValidation, adminController.createBankSampah);
router.get('/bank-sampah/:id', adminController.getBankSampahByIdAdmin);
router.put('/bank-sampah/:id', createBankSampahValidation, adminController.updateBankSampah);
router.delete('/bank-sampah/:id', adminController.deleteBankSampah);
router.post('/bank-sampah/:id/logo', upload.single('logo'), adminController.uploadBankSampahLogo);

// Waste Type Management
router.get('/waste-types', adminController.getWasteTypes);
router.post('/waste-types', 
  body('nama').notEmpty().withMessage('Nama jenis sampah wajib diisi'),
  body('kategori').notEmpty().withMessage('Kategori wajib diisi'),
  body('harga_per_kg').isFloat({ min: 0 }).withMessage('Harga harus berupa angka positif'),
  adminController.createWasteType
);
router.put('/waste-types/:id', adminController.updateWasteType);
router.delete('/waste-types/:id', adminController.deleteWasteType);

// Waste Price Management
router.get('/waste-prices', adminController.getWastePrices);
router.put('/waste-prices', adminController.updateWastePrices);
router.put('/bank-sampah/:bankId/waste-prices', adminController.updateBankSampahWastePrices);

// Transaction Management
router.get('/transactions', adminController.getAllTransactions);
router.get('/transactions/:id', adminController.getTransactionById);
router.put('/transactions/:id/status', 
  body('status').isIn(['pending', 'completed', 'failed']).withMessage('Status tidak valid'),
  adminController.updateTransactionStatus
);

// Notification Management
router.get('/notifications', adminController.getAllNotifications);
router.post('/notifications/broadcast', 
  body('title').notEmpty().withMessage('Judul notifikasi wajib diisi'),
  body('message').notEmpty().withMessage('Pesan notifikasi wajib diisi'),
  body('target_users').optional().isArray().withMessage('Target users harus berupa array'),
  adminController.broadcastNotification
);

// Settings Management
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);
router.post('/settings', 
  body('key').notEmpty().withMessage('Key setting wajib diisi'),
  body('value').notEmpty().withMessage('Value setting wajib diisi'),
  body('type').isIn(['string', 'number', 'boolean', 'json']).withMessage('Type tidak valid'),
  adminController.createSetting
);
router.delete('/settings/:key', adminController.deleteSetting);

// Reports
router.get('/reports/users', dateRangeValidation, adminController.generateUserReport);
router.get('/reports/submissions', dateRangeValidation, adminController.generateSubmissionReport);
router.get('/reports/revenue', dateRangeValidation, adminController.generateRevenueReport);
router.get('/reports/environmental', dateRangeValidation, adminController.generateEnvironmentalReport);

// System Management
router.post('/system/maintenance', 
  body('enabled').isBoolean().withMessage('Enabled harus berupa boolean'),
  adminController.toggleMaintenanceMode
);
router.post('/system/cleanup', adminController.cleanupOldData);
router.get('/system/logs', adminController.getSystemLogs);

module.exports = router;