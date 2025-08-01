// controllers/authController.js - Authentication controller
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User } = require('../models');
const logger = require('../utils/logger');
const { sanitizeUser } = require('../utils/helpers');

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { nama, email, password, phone, address } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Email sudah terdaftar',
          message: 'Silakan gunakan email lain atau login dengan akun yang sudah ada'
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user with correct field names (sesuai database structure)
      const userData = {
        nama,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone: phone || '',  // Default empty string instead of null
        address: address || '',  // Default empty string instead of null (NOT NULL constraint)
        role: 'user',
        is_active: true,
        email_verified: false,
        profile_image: null,
        ewallet_accounts: null,
        admin_notes: null,
        last_login: null,
        join_date: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      const user = await User.create(userData);
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      logger.info(`New user registered: ${email}`, { userId: user.id });

      res.status(201).json({
        success: true,
        message: 'Registrasi berhasil',
        data: {
          user: sanitizeUser(user),
          token,
          expires_in: process.env.JWT_EXPIRES_IN || '7d'
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password } = req.body;

      // Find user by email
      const user = await User.findByEmail(email.toLowerCase());
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Email atau password tidak valid'
        });
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          error: 'Akun Anda telah dinonaktifkan',
          message: 'Silakan hubungi administrator untuk informasi lebih lanjut'
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Email atau password tidak valid'
        });
      }

      // Update last login (sesuai nama kolom di database: last_login, bukan last_login_at)
      await User.update(user.id, { 
        last_login: new Date(),  // Ganti dari last_login_at ke last_login
        updated_at: new Date()
      });

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      logger.info(`User logged in: ${email}`, { userId: user.id });

      res.json({
        success: true,
        message: 'Login berhasil',
        data: {
          user: sanitizeUser(user),
          token,
          expires_in: process.env.JWT_EXPIRES_IN || '7d'
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      // In a stateless JWT system, logout is handled client-side
      // But we can log the event for audit purposes
      if (req.user) {
        logger.info(`User logged out: ${req.user.email}`, { userId: req.user.id });
      }

      res.json({
        success: true,
        message: 'Logout berhasil'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Refresh token
  async refreshToken(req, res) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token diperlukan'
        });
      }

      // Verify refresh token
      const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
      
      // Get user
      const user = await User.findById(decoded.id);
      if (!user || !user.is_active) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token tidak valid'
        });
      }

      // Generate new access token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.json({
        success: true,
        data: {
          token,
          expires_in: process.env.JWT_EXPIRES_IN || '7d'
        }
      });
    } catch (error) {
      logger.error('Refresh token error:', error);
      res.status(401).json({
        success: false,
        error: 'Refresh token tidak valid atau telah kadaluarsa'
      });
    }
  }

  // Forgot password
  async forgotPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email } = req.body;

      // Find user
      const user = await User.findByEmail(email.toLowerCase());
      if (!user) {
        // Don't reveal if email exists for security
        return res.json({
          success: true,
          message: 'Jika email terdaftar, link reset password akan dikirim'
        });
      }

      // Generate reset token (simplified - in production, store this in database)
      const resetToken = jwt.sign(
        { id: user.id, type: 'password_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // TODO: Send email with reset link
      // await sendPasswordResetEmail(user.email, resetToken);

      logger.info(`Password reset requested: ${email}`, { userId: user.id });

      res.json({
        success: true,
        message: 'Link reset password telah dikirim ke email Anda',
        // In development, return token for testing
        ...(process.env.NODE_ENV === 'development' && { reset_token: resetToken })
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Reset password
  async resetPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { token, password } = req.body;

      // Verify reset token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.type !== 'password_reset') {
        return res.status(400).json({
          success: false,
          error: 'Token tidak valid'
        });
      }

      // Get user
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'Token tidak valid'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Update password
      await User.update(user.id, {
        password: hashedPassword,
        updated_at: new Date()
      });

      logger.info(`Password reset completed: ${user.email}`, { userId: user.id });

      res.json({
        success: true,
        message: 'Password berhasil direset'
      });
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(400).json({
          success: false,
          error: 'Token tidak valid'
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(400).json({
          success: false,
          error: 'Token telah kadaluarsa'
        });
      }

      logger.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Verify email
  async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Token verifikasi diperlukan'
        });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.type !== 'email_verification') {
        return res.status(400).json({
          success: false,
          error: 'Token tidak valid'
        });
      }

      // Update user email verification status
      await User.update(decoded.id, {
        email_verified: true,
        updated_at: new Date()
      });

      logger.info(`Email verified for user ID: ${decoded.id}`);

      res.json({
        success: true,
        message: 'Email berhasil diverifikasi'
      });
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(400).json({
          success: false,
          error: 'Token tidak valid atau telah kadaluarsa'
        });
      }

      logger.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Resend verification email
  async resendVerification(req, res) {
    try {
      const { email } = req.body;

      const user = await User.findByEmail(email.toLowerCase());
      if (!user) {
        return res.json({
          success: true,
          message: 'Jika email terdaftar, email verifikasi akan dikirim'
        });
      }

      if (user.email_verified) {
        return res.status(400).json({
          success: false,
          error: 'Email sudah diverifikasi'
        });
      }

      // Generate verification token
      const verificationToken = jwt.sign(
        { id: user.id, type: 'email_verification' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // TODO: Send verification email
      // await sendVerificationEmail(user.email, verificationToken);

      logger.info(`Verification email resent: ${email}`, { userId: user.id });

      res.json({
        success: true,
        message: 'Email verifikasi telah dikirim ulang',
        ...(process.env.NODE_ENV === 'development' && { verification_token: verificationToken })
      });
    } catch (error) {
      logger.error('Resend verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }
}

module.exports = new AuthController();