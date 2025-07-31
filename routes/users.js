const express = require('express');
const { body, validationResult } = require('express-validator');
const { authorizeOwner } = require('../middleware/auth');
const { 
  loadUsers, 
  saveUsers, 
  getUserStats,
  getSubmissionsByUserId 
} = require('../utils/dataHelpers');

const router = express.Router();

// Get current user profile (detailed)
router.get('/profile', (req, res) => {
  try {
    const users = loadUsers();
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({
        error: 'Pengguna tidak ditemukan'
      });
    }

    // Get user statistics
    const stats = getUserStats(req.user.id);

    const { password, ...userResponse } = user;
    
    res.json({
      user: userResponse,
      stats
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      error: 'Gagal mengambil profil pengguna'
    });
  }
});

// Update user profile
router.put('/profile', [
  body('nama').optional().trim().isLength({ min: 2 }).withMessage('Nama minimal 2 karakter'),
  body('phone').optional().isMobilePhone('id-ID').withMessage('Nomor telepon tidak valid'),
  body('address').optional().trim().isLength({ min: 10 }).withMessage('Alamat minimal 10 karakter'),
  body('ewallet_accounts').optional().isObject().withMessage('E-wallet accounts harus berupa object')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Data tidak valid',
        details: errors.array()
      });
    }

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
      return res.status(404).json({
        error: 'Pengguna tidak ditemukan'
      });
    }

    const { nama, phone, address, ewallet_accounts } = req.body;
    
    // Update user data
    if (nama) users[userIndex].nama = nama.trim();
    if (phone) users[userIndex].phone = phone;
    if (address) users[userIndex].address = address.trim();
    if (ewallet_accounts) {
      users[userIndex].ewallet_accounts = { 
        ...users[userIndex].ewallet_accounts, 
        ...ewallet_accounts 
      };
    }
    
    users[userIndex].updated_at = new Date().toISOString();
    
    saveUsers(users);

    const { password: _, ...userResponse } = users[userIndex];
    
    res.json({
      message: 'Profil berhasil diperbarui',
      user: userResponse
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      error: 'Gagal memperbarui profil'
    });
  }
});

// Get user submissions history
router.get('/submissions', (req, res) => {
  try {
    const { page = 1, limit = 10, status = '' } = req.query;
    
    let submissions = getSubmissionsByUserId(req.user.id);

    // Filter by status if provided
    if (status) {
      submissions = submissions.filter(sub => sub.status === status);
    }

    // Sort by creation date (newest first)
    submissions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedSubmissions = submissions.slice(offset, offset + parseInt(limit));

    res.json({
      submissions: paginatedSubmissions,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: submissions.length,
        total_pages: Math.ceil(submissions.length / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get user submissions error:', error);
    res.status(500).json({
      error: 'Gagal mengambil riwayat submission'
    });
  }
});

// Get user statistics
router.get('/stats', (req, res) => {
  try {
    const stats = getUserStats(req.user.id);
    
    // Add environmental impact calculations
    const environmentalImpact = {
      co2_reduced: (stats.total_weight * 2.5).toFixed(2), // 2.5kg CO2 per kg waste
      trees_saved: Math.floor(stats.total_weight / 20), // 1 tree per 20kg waste
      landfill_diverted: stats.total_weight
    };

    res.json({
      stats: {
        ...stats,
        environmental_impact: environmentalImpact
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Gagal mengambil statistik pengguna'
    });
  }
});

// Update user e-wallet accounts
router.patch('/ewallet', [
  body('dana').optional().isMobilePhone('id-ID').withMessage('Nomor DANA tidak valid'),
  body('ovo').optional().isMobilePhone('id-ID').withMessage('Nomor OVO tidak valid'),
  body('gopay').optional().isMobilePhone('id-ID').withMessage('Nomor GoPay tidak valid')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Data tidak valid',
        details: errors.array()
      });
    }

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
      return res.status(404).json({
        error: 'Pengguna tidak ditemukan'
      });
    }

    const { dana, ovo, gopay } = req.body;
    
    // Update e-wallet accounts
    if (dana) users[userIndex].ewallet_accounts.dana = dana;
    if (ovo) users[userIndex].ewallet_accounts.ovo = ovo;
    if (gopay) users[userIndex].ewallet_accounts.gopay = gopay;
    
    users[userIndex].updated_at = new Date().toISOString();
    
    saveUsers(users);

    res.json({
      message: 'E-wallet accounts berhasil diperbarui',
      ewallet_accounts: users[userIndex].ewallet_accounts
    });

  } catch (error) {
    console.error('Update e-wallet error:', error);
    res.status(500).json({
      error: 'Gagal memperbarui e-wallet accounts'
    });
  }
});

// Change password
router.patch('/password', [
  body('current_password').notEmpty().withMessage('Password lama diperlukan'),
  body('new_password').isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter'),
  body('confirm_password').custom((value, { req }) => {
    if (value !== req.body.new_password) {
      throw new Error('Konfirmasi password tidak cocok');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Data tidak valid',
        details: errors.array()
      });
    }

    const bcrypt = require('bcryptjs');
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
      return res.status(404).json({
        error: 'Pengguna tidak ditemukan'
      });
    }

    const { current_password, new_password } = req.body;
    const user = users[userIndex];

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Password lama tidak benar'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);

    // Update password
    users[userIndex].password = hashedNewPassword;
    users[userIndex].updated_at = new Date().toISOString();
    
    saveUsers(users);

    res.json({
      message: 'Password berhasil diubah'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Gagal mengubah password'
    });
  }
});

// Delete user account (soft delete)
router.delete('/account', [
  body('password').notEmpty().withMessage('Password diperlukan untuk menghapus akun'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Alasan maksimal 500 karakter')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Data tidak valid',
        details: errors.array()
      });
    }

    const bcrypt = require('bcryptjs');
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
      return res.status(404).json({
        error: 'Pengguna tidak ditemukan'
      });
    }

    const { password, reason } = req.body;
    const user = users[userIndex];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Password tidak benar'
      });
    }

    // Soft delete - deactivate account
    users[userIndex].is_active = false;
    users[userIndex].deleted_at = new Date().toISOString();
    users[userIndex].deletion_reason = reason || '';
    users[userIndex].updated_at = new Date().toISOString();
    
    saveUsers(users);

    res.json({
      message: 'Akun berhasil dihapus. Terima kasih telah menggunakan EcoMarga.'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      error: 'Gagal menghapus akun'
    });
  }
});

module.exports = router;