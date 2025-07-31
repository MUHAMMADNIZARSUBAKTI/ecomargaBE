// controllers/authController.js - Authentication controller
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User } = require('../models');
const { sendEmail, emailTemplates } = require('../utils/email');
const logger = require('../utils/logger');

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

      const { nama, email, password, no_telepon, alamat } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Email sudah terdaftar'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const userData = {
        nama,
        email,
        password: hashedPassword,
        no_telepon,
        alamat,
        role: 'user',
        is_active: true,
        saldo: 0
      };

      const user = await User.create(userData);

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Send welcome email (optional)
      try {
        const welcomeEmail = emailTemplates.welcome(user.nama);
        await sendEmail({
          to: user.email,
          subject: welcomeEmail.subject,
          html: welcomeEmail.html
        });
      } catch (emailError) {
        logger.error('Failed to send welcome email:', emailError);
        // Continue without failing the registration
      }

      logger.info(`New user registered: ${user.email}`);

      res.status(201).json({
        success: true,
        message: 'Registrasi berhasil',
        data: {
          user: {
            id: user.id,
            nama: user.nama,
            email: user.email,
            role: user.role,
            saldo: user.saldo
          },
          token
        }
      });

    } catch (error) {
      logger.error('Register error:', error);
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

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Email atau password salah'
        });
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          error: 'Akun Anda telah dinonaktifkan'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Email atau password salah'
        });
      }

      // Update last login
      await User.updateLastLogin(user.id);

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Generate refresh token
      const refreshToken = jwt.sign(
        { id: user.id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
      );

      logger.info(`User logged in: ${user.email}`);

      res.json({
        success: true,
        message: 'Login berhasil',
        data: {
          user: {
            id: user.id,
            nama: user.nama,
            email: user.email,
            role: user.role,
            saldo: user.saldo,
            avatar_url: user.avatar_url
          },
          token,
          refreshToken
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

  // Refresh token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token diperlukan'
        });
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
      
      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          error: 'Invalid refresh token'
        });
      }

      const user = await User.findById(decoded.id);

      if (!user || !user.is_active) {
        return res.status(401).json({
          success: false,
          error: 'Invalid refresh token'
        });
      }

      // Generate new access token
      const newToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.json({
        success: true,
        data: {
          token: newToken
        }
      });

    } catch (error) {
      logger.error('Refresh token error:', error);
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid refresh token'
        });
      }
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Logout (if using token blacklist)
  async logout(req, res) {
    try {
      // In a real implementation, you might want to blacklist the token
      // For now, we'll just send a success response
      logger.info(`User logged out: ${req.user?.email || 'unknown'}`);
      
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

      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal whether user exists or not
        return res.json({
          success: true,
          message: 'Jika email terdaftar, link reset password akan dikirim'
        });
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { id: user.id, email: user.email, type: 'password_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Send email (implement this based on your email service)
      try {
        await sendEmail({
          to: user.email,
          subject: 'Reset Password - EcoMarga',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #10b981;">Reset Password</h2>
              <p>Halo ${user.nama},</p>
              <p>Kami menerima permintaan untuk reset password akun Anda.</p>
              <p>Klik link berikut untuk reset password Anda:</p>
              <a href="${process.env.CLIENT_URL}/reset-password?token=${resetToken}" 
                 style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Reset Password
              </a>
              <p>Link ini akan expired dalam 1 jam.</p>
              <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
            </div>
          `
        });

        logger.info(`Password reset email sent to: ${email}`);
      } catch (emailError) {
        logger.error('Failed to send reset password email:', emailError);
        return res.status(500).json({
          success: false,
          error: 'Gagal mengirim email reset password'
        });
      }

      res.json({
        success: true,
        message: 'Link reset password telah dikirim ke email Anda'
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

      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Token dan password baru diperlukan'
        });
      }

      // Verify reset token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.type !== 'password_reset') {
        return res.status(401).json({
          success: false,
          error: 'Invalid reset token'
        });
      }

      // Find user
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid reset token'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await User.updatePassword(user.id, hashedPassword);

      logger.info(`Password reset successful for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Password berhasil direset'
      });

    } catch (error) {
      logger.error('Reset password error:', error);
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Reset token tidak valid atau expired'
        });
      }
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Change password (for authenticated users)
  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Get current user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User tidak ditemukan'
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          error: 'Password saat ini salah'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await User.updatePassword(userId, hashedPassword);

      logger.info(`Password changed for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Password berhasil diubah'
      });

    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Get current user info
  async me(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User tidak ditemukan'
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            nama: user.nama,
            email: user.email,
            role: user.role,
            saldo: user.saldo,
            avatar_url: user.avatar_url,
            no_telepon: user.no_telepon,
            alamat: user.alamat,
            total_submission: user.total_submission,
            total_berat: user.total_berat,
            created_at: user.created_at,
            last_login_at: user.last_login_at
          }
        }
      });

    } catch (error) {
      logger.error('Get me error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }
}

module.exports = new AuthController();