// routes/submissions.js - Submission management routes
const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { 
  loadSubmissions, 
  saveSubmissions, 
  loadUsers, 
  saveUsers,
  generateId 
} = require('../utils/dataHelpers');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/submissions/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'submission-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar (JPEG, JPG, PNG) yang diizinkan'));
    }
  }
});

// Waste type pricing (Rp per kg)
const WASTE_PRICING = {
  'Botol Plastik': 3000,
  'Kardus': 2000,
  'Kaleng Aluminium': 8000,
  'Kertas': 1500,
  'Besi': 5000,
  'Kaca': 1000,
  'Plastik Campuran': 2500
};

// Platform fee percentage
const PLATFORM_FEE_PERCENTAGE = 0.10; // 10%

// Submission validation
const submissionValidation = [
  body('waste_type').isIn(Object.keys(WASTE_PRICING)).withMessage('Jenis sampah tidak valid'),
  body('estimated_weight').isFloat({ min: 0.1, max: 100 }).withMessage('Berat harus antara 0.1 - 100 kg'),
  body('ewallet_type').isIn(['dana', 'ovo', 'gopay']).withMessage('Jenis e-wallet tidak valid'),
  body('pickup_address').trim().isLength({ min: 10 }).withMessage('Alamat penjemputan minimal 10 karakter'),
  body('pickup_schedule').isISO8601().withMessage('Jadwal penjemputan tidak valid'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Catatan maksimal 500 karakter')
];

// Get all submissions for current user
router.get('/', (req, res) => {
  try {
    const submissions = loadSubmissions();
    const userSubmissions = submissions
      .filter(sub => sub.user_id === req.user.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      submissions: userSubmissions,
      total: userSubmissions.length
    });

  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      error: 'Gagal mengambil data submission'
    });
  }
});

// Get submission by ID
router.get('/:id', (req, res) => {
  try {
    const submissions = loadSubmissions();
    const submission = submissions.find(sub => 
      sub.id === parseInt(req.params.id) && sub.user_id === req.user.id
    );

    if (!submission) {
      return res.status(404).json({
        error: 'Submission tidak ditemukan'
      });
    }

    res.json({ submission });

  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({
      error: 'Gagal mengambil data submission'
    });
  }
});

// Create new submission
router.post('/', upload.array('images', 5), submissionValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Data tidak valid',
        details: errors.array()
      });
    }

    const { 
      waste_type, 
      estimated_weight, 
      ewallet_type, 
      pickup_address, 
      pickup_schedule,
      notes 
    } = req.body;

    const submissions = loadSubmissions();
    const users = loadUsers();
    
    // Get user info
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'Pengguna tidak ditemukan'
      });
    }

    // Check if user has e-wallet account for selected type
    if (!user.ewallet_accounts[ewallet_type]) {
      return res.status(400).json({
        error: 'E-wallet tidak terdaftar',
        message: `Akun ${ewallet_type.toUpperCase()} belum terdaftar di profil Anda`
      });
    }

    // Calculate estimated values
    const price_per_kg = WASTE_PRICING[waste_type];
    const estimated_value = parseFloat(estimated_weight) * price_per_kg;
    const platform_fee = estimated_value * PLATFORM_FEE_PERCENTAGE;
    const estimated_transfer = estimated_value - platform_fee;

    // Process uploaded images
    const images = req.files ? req.files.map(file => ({
      filename: file.filename,
      original_name: file.originalname,
      path: file.path,
      size: file.size
    })) : [];

    // Create new submission
    const newSubmission = {
      id: generateId(submissions),
      user_id: req.user.id,
      waste_type,
      estimated_weight: parseFloat(estimated_weight),
      actual_weight: null,
      price_per_kg,
      estimated_value,
      actual_value: null,
      platform_fee,
      estimated_transfer,
      actual_transfer: null,
      ewallet_type,
      ewallet_account: user.ewallet_accounts[ewallet_type],
      pickup_address,
      pickup_schedule: new Date(pickup_schedule).toISOString(),
      notes: notes || '',
      images,
      status: 'pending', // pending, picked_up, verified, completed, cancelled
      status_history: [
        {
          status: 'pending',
          timestamp: new Date().toISOString(),
          note: 'Submission dibuat'
        }
      ],
      pickup_driver: null,
      pickup_time: null,
      verification_time: null,
      transfer_time: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    submissions.push(newSubmission);
    saveSubmissions(submissions);

    res.status(201).json({
      message: 'Submission berhasil dibuat',
      submission: newSubmission
    });

  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({
      error: 'Gagal membuat submission',
      message: error.message
    });
  }
});

// Update submission status (for admin/driver use)
router.patch('/:id/status', [
  body('status').isIn(['pending', 'picked_up', 'verified', 'completed', 'cancelled']),
  body('note').optional().trim().isLength({ max: 200 }),
  body('actual_weight').optional().isFloat({ min: 0 }),
  body('driver_id').optional().isInt()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Data tidak valid',
        details: errors.array()
      });
    }

    const submissions = loadSubmissions();
    const submissionIndex = submissions.findIndex(sub => 
      sub.id === parseInt(req.params.id)
    );

    if (submissionIndex === -1) {
      return res.status(404).json({
        error: 'Submission tidak ditemukan'
      });
    }

    const { status, note, actual_weight, driver_id } = req.body;
    const submission = submissions[submissionIndex];

    // Update status
    submission.status = status;
    submission.updated_at = new Date().toISOString();

    // Add to status history
    submission.status_history.push({
      status,
      timestamp: new Date().toISOString(),
      note: note || '',
      updated_by: req.user.id
    });

    // Handle specific status updates
    switch (status) {
      case 'picked_up':
        submission.pickup_time = new Date().toISOString();
        if (driver_id) submission.pickup_driver = driver_id;
        break;
        
      case 'verified':
        submission.verification_time = new Date().toISOString();
        if (actual_weight) {
          submission.actual_weight = parseFloat(actual_weight);
          submission.actual_value = submission.actual_weight * submission.price_per_kg;
          submission.platform_fee = submission.actual_value * PLATFORM_FEE_PERCENTAGE;
          submission.actual_transfer = submission.actual_value - submission.platform_fee;
        }
        break;
        
      case 'completed':
        submission.transfer_time = new Date().toISOString();
        // In real app, trigger actual payment here
        break;
    }

    saveSubmissions(submissions);

    res.json({
      message: 'Status submission berhasil diperbarui',
      submission: submissions[submissionIndex]
    });

  } catch (error) {
    console.error('Update submission status error:', error);
    res.status(500).json({
      error: 'Gagal memperbarui status submission'
    });
  }
});

// Cancel submission (user only, only if status is pending)
router.patch('/:id/cancel', (req, res) => {
  try {
    const submissions = loadSubmissions();
    const submissionIndex = submissions.findIndex(sub => 
      sub.id === parseInt(req.params.id) && sub.user_id === req.user.id
    );

    if (submissionIndex === -1) {
      return res.status(404).json({
        error: 'Submission tidak ditemukan'
      });
    }

    const submission = submissions[submissionIndex];

    if (submission.status !== 'pending') {
      return res.status(400).json({
        error: 'Submission tidak dapat dibatalkan',
        message: 'Hanya submission dengan status pending yang dapat dibatalkan'
      });
    }

    // Update status to cancelled
    submission.status = 'cancelled';
    submission.updated_at = new Date().toISOString();
    submission.status_history.push({
      status: 'cancelled',
      timestamp: new Date().toISOString(),
      note: 'Dibatalkan oleh pengguna',
      updated_by: req.user.id
    });

    saveSubmissions(submissions);

    res.json({
      message: 'Submission berhasil dibatalkan',
      submission
    });

  } catch (error) {
    console.error('Cancel submission error:', error);
    res.status(500).json({
      error: 'Gagal membatalkan submission'
    });
  }
});

// Get submission statistics for user
router.get('/stats/summary', (req, res) => {
  try {
    const submissions = loadSubmissions();
    const userSubmissions = submissions.filter(sub => sub.user_id === req.user.id);

    const stats = {
      total_submissions: userSubmissions.length,
      pending: userSubmissions.filter(sub => sub.status === 'pending').length,
      completed: userSubmissions.filter(sub => sub.status === 'completed').length,
      cancelled: userSubmissions.filter(sub => sub.status === 'cancelled').length,
      total_weight: userSubmissions
        .filter(sub => sub.actual_weight)
        .reduce((sum, sub) => sum + sub.actual_weight, 0),
      total_earnings: userSubmissions
        .filter(sub => sub.status === 'completed' && sub.actual_transfer)
        .reduce((sum, sub) => sum + sub.actual_transfer, 0),
      this_month: {
        submissions: userSubmissions.filter(sub => {
          const submissionDate = new Date(sub.created_at);
          const now = new Date();
          return submissionDate.getMonth() === now.getMonth() && 
                 submissionDate.getFullYear() === now.getFullYear();
        }).length,
        earnings: userSubmissions
          .filter(sub => {
            const submissionDate = new Date(sub.created_at);
            const now = new Date();
            return sub.status === 'completed' && 
                   sub.actual_transfer &&
                   submissionDate.getMonth() === now.getMonth() && 
                   submissionDate.getFullYear() === now.getFullYear();
          })
          .reduce((sum, sub) => sum + sub.actual_transfer, 0)
      }
    };

    res.json({ stats });

  } catch (error) {
    console.error('Get submission stats error:', error);
    res.status(500).json({
      error: 'Gagal mengambil statistik submission'
    });
  }
});

module.exports = router;