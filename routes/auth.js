const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { User } = require('../models');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('nama').trim().isLength({ min: 2 }).withMessage('Nama minimal 2 karakter'),
  body('email').isEmail().normalizeEmail().withMessage('Email tidak valid'),
  body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
  body('phone').isMobilePhone('id-ID').withMessage('Nomor telepon tidak valid'),
  body('address').trim().isLength({ min: 10 }).withMessage('Alamat minimal 10 karakter')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email tidak valid'),
  body('password').notEmpty().withMessage('Password tidak boleh kosong')
];

// Helper function to generate JWT tokens
const generateTokens = (user) => {
  const payload = { 
    id: user.id, 
    email: user.email, 
    role: user.role 
  };
  
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  return { accessToken, refreshToken };
};

// Helper function to remove sensitive data
const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
};

// Register endpoint
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Data tidak valid',
        details: errors.array()
      });
    }

    const { nama, email, password, phone, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: 'Pengguna sudah terdaftar',
        message: 'Email sudah digunakan oleh akun lain'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user data
    const userData = {
      nama: nama.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      address: address.trim(),
      role: 'user',
      is_active: true,
      email_verified: false,
      ewallet_accounts: {},
      join_date: new Date().toISOString()
    };

    // Create user
    const newUser = await User.create(userData);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(newUser);

    // Return response without password
    const userResponse = sanitizeUser(newUser);

    res.status(201).json({
      message: 'Registrasi berhasil',
      user: userResponse,
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: 'Gagal mendaftar',
      message: 'Terjadi kesalahan pada server'
    });
  }
});

// Login endpoint
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Data tidak valid',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Login gagal',
        message: 'Email atau password salah'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        error: 'Akun tidak aktif',
        message: 'Akun Anda telah dinonaktifkan. Hubungi administrator.'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Login gagal',
        message: 'Email atau password salah'
      });
    }

    // Update last login
    await User.update(user.id, {
      last_login: new Date().toISOString()
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Return response without password
    const userResponse = sanitizeUser(user);

    res.json({
      message: 'Login berhasil',
      user: userResponse,
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Gagal login',
      message: 'Terjadi kesalahan pada server'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        error: 'Pengguna tidak ditemukan'
      });
    }

    // Get user statistics
    const stats = await User.getStats(req.user.id);

    const userResponse = sanitizeUser(user);
    
    res.json({
      user: userResponse,
      stats
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Gagal mengambil profil'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('nama').optional().trim().isLength({ min: 2 }).withMessage('Nama minimal 2 karakter'),
  body('phone').optional().isMobilePhone('id-ID').withMessage('Nomor telepon tidak valid'),
  body('address').optional().trim().isLength({ min: 10 }).withMessage('Alamat minimal 10 karakter'),
  body('ewallet_accounts').optional().isObject().withMessage('E-wallet accounts harus berupa object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Data tidak valid',
        details: errors.array()
      });
    }

    const { nama, phone, address, ewallet_accounts } = req.body;
    
    // Prepare update data
    const updateData = {};
    if (nama) updateData.nama = nama.trim();
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address.trim();
    if (ewallet_accounts) {
      // Merge with existing ewallet accounts
      const currentUser = await User.findById(req.user.id);
      updateData.ewallet_accounts = {
        ...currentUser.ewallet_accounts,
        ...ewallet_accounts
      };
    }

    // Update user
    const updatedUser = await User.update(req.user.id, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({
        error: 'Pengguna tidak ditemukan'
      });
    }

    const userResponse = sanitizeUser(updatedUser);
    
    res.json({
      message: 'Profil berhasil diperbarui',
      user: userResponse
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Gagal memperbarui profil'
    });
  }
});

// Change password
router.put('/change-password', authenticateToken, [
  body('current_password').notEmpty().withMessage('Password lama tidak boleh kosong'),
  body('new_password').isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter'),
  body('confirm_password').custom((value, { req }) => {
    if (value !== req.body.new_password) {
      throw new Error('Konfirmasi password tidak sesuai');
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

    const { current_password, new_password } = req.body;

    // Get current user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'Pengguna tidak ditemukan'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Password lama salah'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await User.update(req.user.id, {
      password: hashedNewPassword
    });

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

// Refresh token endpoint
router.post('/refresh-token', [
  body('refresh_token').notEmpty().withMessage('Refresh token tidak boleh kosong')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Data tidak valid',
        details: errors.array()
      });
    }

    const { refresh_token } = req.body;

    // Verify refresh token
    const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    // Get user
    const user = await User.findById(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({
        error: 'Token tidak valid'
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken } = generateTokens(user);

    res.json({
      message: 'Token berhasil diperbarui',
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token tidak valid atau sudah kedaluwarsa'
      });
    }

    res.status(500).json({
      error: 'Gagal memperbarui token'
    });
  }
});

// Logout endpoint (optional - mainly for logging purposes)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a more complex system, you might want to blacklist the token
    // For now, we'll just log the logout event
    console.log(`User ${req.user.id} logged out at ${new Date().toISOString()}`);
    
    res.json({
      message: 'Logout berhasil'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Gagal logout'
    });
  }
});

// Verify email endpoint (placeholder for future implementation)
router.post('/verify-email', [
  body('email').isEmail().normalizeEmail().withMessage('Email tidak valid'),
  body('verification_code').isLength({ min: 6, max: 6 }).withMessage('Kode verifikasi harus 6 digit')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Data tidak valid',
        details: errors.array()
      });
    }

    // TODO: Implement email verification logic
    res.status(501).json({
      error: 'Fitur belum tersedia',
      message: 'Verifikasi email akan segera tersedia'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Gagal memverifikasi email'
    });
  }
});

// Forgot password endpoint (placeholder for future implementation)
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Email tidak valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Data tidak valid',
        details: errors.array()
      });
    }

    // TODO: Implement forgot password logic
    res.status(501).json({
      error: 'Fitur belum tersedia',
      message: 'Reset password akan segera tersedia'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Gagal memproses permintaan reset password'
    });
  }
});

module.exports = router;