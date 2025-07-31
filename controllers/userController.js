// controllers/userController.js - User management controller
const { validationResult } = require('express-validator');
const { User, Transaction, Submission } = require('../models');
const logger = require('../utils/logger');
const { getPaginationInfo } = require('../utils/helpers');

class UserController {
  // Get user profile
  async getUserProfile(req, res) {
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
            no_telepon: user.no_telepon,
            alamat: user.alamat,
            avatar_url: user.avatar_url,
            saldo: user.saldo,
            total_submission: user.total_submission,
            total_berat: user.total_berat,
            created_at: user.created_at,
            last_login_at: user.last_login_at
          }
        }
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { nama, no_telepon, alamat } = req.body;
      const userId = req.user.id;

      const updateData = {};
      if (nama) updateData.nama = nama;
      if (no_telepon) updateData.no_telepon = no_telepon;
      if (alamat) updateData.alamat = alamat;

      const updatedUser = await User.update(userId, updateData);

      logger.info(`Profile updated for user: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Profile berhasil diupdate',
        data: {
          user: {
            id: updatedUser.id,
            nama: updatedUser.nama,
            email: updatedUser.email,
            no_telepon: updatedUser.no_telepon,
            alamat: updatedUser.alamat,
            avatar_url: updatedUser.avatar_url
          }
        }
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Upload avatar
  async uploadAvatar(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'File avatar diperlukan'
        });
      }

      const userId = req.user.id;
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      await User.updateAvatar(userId, avatarUrl);

      logger.info(`Avatar uploaded for user: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Avatar berhasil diupload',
        data: {
          avatar_url: avatarUrl
        }
      });
    } catch (error) {
      logger.error('Upload avatar error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Get user balance
  async getBalance(req, res) {
    try {
      const user = await User.findById(req.user.id);
      
      res.json({
        success: true,
        data: {
          saldo: user.saldo,
          saldo_pending: user.saldo_pending || 0
        }
      });
    } catch (error) {
      logger.error('Get balance error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Get user transactions
  async getTransactions(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const transactions = await Transaction.findByUserId(req.user.id, { limit, offset });
      const totalCount = await Transaction.countByUserId(req.user.id);

      const pagination = getPaginationInfo(page, limit, totalCount);

      res.json({
        success: true,
        data: {
          transactions,
          pagination
        }
      });
    } catch (error) {
      logger.error('Get transactions error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Get user submissions
  async getSubmissions(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const status = req.query.status;

      const filters = { user_id: req.user.id };
      if (status) filters.status = status;

      const submissions = await Submission.findAll(filters, { page, limit });
      const totalCount = await Submission.count(filters);

      const pagination = getPaginationInfo(page, limit, totalCount);

      res.json({
        success: true,
        data: {
          submissions,
          pagination
        }
      });
    } catch (error) {
      logger.error('Get submissions error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Get user statistics
  async getUserStats(req, res) {
    try {
      const userId = req.user.id;

      // Get submission stats
      const submissionStats = await Submission.getStatsByUser(userId);

      // Get transaction stats for this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      const monthlyTransactionStats = await Transaction.getStatsByDateRange(
        startOfMonth, 
        endOfMonth, 
        { user_id: userId, jenis: 'kredit' }
      );

      // Get user rank
      const userRank = await User.getUserRank(userId);

      res.json({
        success: true,
        data: {
          submission_stats: submissionStats,
          monthly_earnings: monthlyTransactionStats.total_kredit,
          user_rank: userRank,
          environmental_impact: {
            co2_saved: submissionStats.total_berat * 2.3, // kg CO2
            energy_saved: submissionStats.total_berat * 1.5, // kWh
            water_saved: submissionStats.total_berat * 10 // liters
          }
        }
      });
    } catch (error) {
      logger.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Get balance history
  async getBalanceHistory(req, res) {
    try {
      const days = parseInt(req.query.days) || 30;
      const balanceHistory = await Transaction.getBalanceHistory(req.user.id, days);

      res.json({
        success: true,
        data: {
          balance_history: balanceHistory
        }
      });
    } catch (error) {
      logger.error('Get balance history error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Request withdrawal
  async requestWithdrawal(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { amount, bank_name, account_number, account_name } = req.body;
      const userId = req.user.id;

      // Check minimum withdrawal amount
      const minWithdrawal = 50000; // From settings
      if (amount < minWithdrawal) {
        return res.status(400).json({
          success: false,
          error: `Jumlah penarikan minimal Rp ${minWithdrawal.toLocaleString('id-ID')}`
        });
      }

      // Check user balance
      const user = await User.findById(userId);
      if (user.saldo < amount) {
        return res.status(400).json({
          success: false,
          error: 'Saldo tidak mencukupi'
        });
      }

      // Create withdrawal transaction
      const metadata = {
        bank_name,
        account_number,
        account_name
      };

      const transaction = await Transaction.createWithdrawalTransaction(userId, amount, metadata);

      logger.info(`Withdrawal requested by user: ${req.user.email}, amount: ${amount}`);

      res.json({
        success: true,
        message: 'Permintaan penarikan berhasil dibuat',
        data: {
          transaction: {
            id: transaction.id,
            kode_transaksi: transaction.kode_transaksi,
            jumlah: transaction.jumlah,
            status: transaction.status,
            created_at: transaction.created_at
          }
        }
      });
    } catch (error) {
      logger.error('Request withdrawal error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Terjadi kesalahan server'
      });
    }
  }

  // Delete user account
  async deleteAccount(req, res) {
    try {
      const userId = req.user.id;

      // Check if user has pending submissions
      const pendingSubmissions = await Submission.count({
        user_id: userId,
        status: ['pending', 'confirmed', 'picked_up']
      });

      if (pendingSubmissions > 0) {
        return res.status(400).json({
          success: false,
          error: 'Tidak dapat menghapus akun dengan submission yang masih pending'
        });
      }

      // Deactivate account instead of hard delete
      await User.deactivate(userId);

      logger.info(`Account deactivated for user: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Akun berhasil dihapus'
      });
    } catch (error) {
      logger.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Get user notifications
  async getNotifications(req, res) {
    try {
      const { Notification } = require('../models');
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const is_read = req.query.is_read;

      const filters = {};
      if (is_read !== undefined) {
        filters.is_read = is_read === 'true';
      }

      const offset = (page - 1) * limit;
      const notifications = await Notification.findByUserId(req.user.id, { ...filters, limit, offset });
      const totalCount = await Notification.countByUserId(req.user.id, filters);
      const unreadCount = await Notification.getUnreadCount(req.user.id);

      const pagination = getPaginationInfo(page, limit, totalCount);

      res.json({
        success: true,
        data: {
          notifications,
          unread_count: unreadCount,
          pagination
        }
      });
    } catch (error) {
      logger.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Mark notification as read
  async markNotificationAsRead(req, res) {
    try {
      const { Notification } = require('../models');
      const notificationId = parseInt(req.params.id);

      const notification = await Notification.markAsRead(notificationId, req.user.id);

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notifikasi tidak ditemukan'
        });
      }

      res.json({
        success: true,
        message: 'Notifikasi berhasil ditandai sebagai dibaca'
      });
    } catch (error) {
      logger.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Mark all notifications as read
  async markAllNotificationsAsRead(req, res) {
    try {
      const { Notification } = require('../models');
      const updatedCount = await Notification.markAllAsRead(req.user.id);

      res.json({
        success: true,
        message: `${updatedCount} notifikasi berhasil ditandai sebagai dibaca`
      });
    } catch (error) {
      logger.error('Mark all notifications as read error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Get user leaderboard position
  async getLeaderboardPosition(req, res) {
    try {
      const userRank = await User.getUserRank(req.user.id);
      const leaderboard = await User.getLeaderboard(10);

      res.json({
        success: true,
        data: {
          user_rank: userRank,
          top_users: leaderboard
        }
      });
    } catch (error) {
      logger.error('Get leaderboard position error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }
}

module.exports = new UserController();