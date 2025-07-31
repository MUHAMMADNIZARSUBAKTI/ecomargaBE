// routes/auth.js - Authentication routes
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { loadUsers, saveUsers, generateId } = require('../utils/dataHelpers');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('nama').trim().isLength({ min: 2 }).withMessage('Nama minimal 2 karakter'),
  body('email').isEmail().withMessage('Email tidak valid'),
  body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
  body('phone').isMobilePhone('id-ID').withMessage('Nomor telepon tidak valid'),
  body('address').trim().isLength({ min: 10 }).withMessage('Alamat minimal 10 karakter')
];

const loginValidation = [
  body('email').isEmail().withMessage('Email tidak valid'),
  body('password').notEmpty().withMessage('Password tidak boleh kosong')
];

// Helper function to generate JWT
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
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
    const users = loadUsers();

    // Check if user already exists
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({
        error: 'Pengguna sudah terdaftar',
        message: 'Email sudah digunakan'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = {
      id: generateId(users),
      nama: nama.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      address: address.trim(),
      role: 'user',
      join_date: new Date().toISOString(),
      is_active: true,
      ewallet_accounts: {
        dana: phone,
        ovo: phone,
        gopay: phone
      },
      profile_image: null,
      email_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(newUser);

    // Remove password from response
    const { password: _, ...userResponse } = newUser;

    res.status(201).json({
      message: 'Registrasi berhasil',
      user: userResponse,
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Registration error:', error);
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
    const users = loadUsers();

    // Find user
    const user = users.find(u => u.email === email.toLowerCase());
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
        message: 'Hubungi administrator'
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

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Update last login
    user.last_login = new Date().toISOString();
    user.updated_at = new Date().toISOString();
    saveUsers(users);

    // Remove password from response
    const { password: _, ...userResponse } = user;

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
router.get('/profile', authenticateToken, (req, res) => {
  try {
    const users = loadUsers();
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({
        error: 'Pengguna tidak ditemukan'
      });
    }

    const { password: _, ...userResponse } = user;
    
    res.json({
      user: userResponse
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
  body('nama').optional().trim().isLength({ min: 2 }),
  body('phone').optional().isMobilePhone('id-ID'),
  body('address').optional().trim().isLength({ min: 10 })
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
    if (ewallet_accounts) users[userIndex].ewallet_accounts = { ...users[userIndex].ewallet_accounts, ...ewallet_accounts };
    
    users[userIndex].updated_at = new Date().toISOString();
    
    saveUsers(users);

    const { password: _, ...userResponse } = users[userIndex];
    
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

// Refresh token endpoint
router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token diperlukan'
      });
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          error: 'Refresh token tidak valid'
        });
      }

      const users = loadUsers();
      const user = users.find(u => u.id === decoded.id);
      
      if (!user || !user.is_active) {
        return res.status(403).json({
          error: 'Pengguna tidak valid'
        });
      }

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
      
      res.json({
        accessToken,
        refreshToken: newRefreshToken
      });
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Gagal memperbarui token'
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, (req, res) => {
  // In a real app, you'd invalidate the token in a blacklist
  res.json({
    message: 'Logout berhasil'
  });
});

module.exports = router;