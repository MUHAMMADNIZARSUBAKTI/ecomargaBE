// controllers/submissionController.js - Submission management controller
const { validationResult } = require('express-validator');
const { Submission, BankSampah, WasteType, User, Transaction } = require('../models');
const logger = require('../utils/logger');
const { getPaginationInfo } = require('../utils/helpers');
const path = require('path');
const fs = require('fs').promises;

class SubmissionController {
  // Create new submission
  async createSubmission(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { waste_type_id, bank_sampah_id, berat, deskripsi } = req.body;
      const userId = req.user.id;

      // Validate waste type exists
      const wasteType = await WasteType.findById(waste_type_id);
      if (!wasteType) {
        return res.status(404).json({
          success: false,
          error: 'Jenis sampah tidak ditemukan'
        });
      }

      // Validate bank sampah exists and is active
      const bankSampah = await BankSampah.findById(bank_sampah_id);
      if (!bankSampah) {
        return res.status(404).json({
          success: false,
          error: 'Bank sampah tidak ditemukan'
        });
      }

      if (!bankSampah.is_active) {
        return res.status(400).json({
          success: false,
          error: 'Bank sampah sedang tidak aktif'
        });
      }

      // Calculate estimated earnings
      const estimatedPrice = parseFloat(berat) * parseFloat(wasteType.harga_per_kg);

      // Handle file uploads
      let photoUrls = [];
      if (req.files && req.files.length > 0) {
        photoUrls = req.files.map(file => `/uploads/submissions/${file.filename}`);
      }

      // Create submission
      const submissionData = {
        user_id: userId,
        waste_type_id: parseInt(waste_type_id),
        bank_sampah_id: parseInt(bank_sampah_id),
        berat: parseFloat(berat),
        estimated_price: estimatedPrice,
        deskripsi: deskripsi || null,
        foto_urls: JSON.stringify(photoUrls),
        status: 'pending',
        submission_code: generateSubmissionCode(),
        created_at: new Date(),
        updated_at: new Date()
      };

      const submission = await Submission.create(submissionData);

      // Log submission creation
      logger.info(`New submission created: ${submission.id} by user ${userId}`);

      // Get submission with relations for response
      const submissionWithDetails = await Submission.findById(submission.id);

      res.status(201).json({
        success: true,
        message: 'Submission berhasil dibuat',
        data: {
          submission: {
            ...submissionWithDetails,
            foto_urls: JSON.parse(submissionWithDetails.foto_urls || '[]')
          }
        }
      });
    } catch (error) {
      logger.error('Create submission error:', error);
      
      // Clean up uploaded files if error occurs
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            logger.error('Error deleting file:', unlinkError);
          }
        }
      }

      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Get user submissions
  async getUserSubmissions(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const status = req.query.status;
      const waste_type_id = req.query.waste_type_id;

      const filters = { user_id: req.user.id };
      if (status) filters.status = status;
      if (waste_type_id) filters.waste_type_id = parseInt(waste_type_id);

      const submissions = await Submission.findAll(filters, { page, limit });
      const totalCount = await Submission.count(filters);

      // Parse foto_urls for each submission
      const processedSubmissions = submissions.map(submission => ({
        ...submission,
        foto_urls: JSON.parse(submission.foto_urls || '[]')
      }));

      const pagination = getPaginationInfo(page, limit, totalCount);

      res.json({
        success: true,
        data: {
          submissions: processedSubmissions,
          pagination
        }
      });
    } catch (error) {
      logger.error('Get user submissions error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Get submission by ID
  async getSubmissionById(req, res) {
    try {
      const submissionId = parseInt(req.params.id);
      const userId = req.user.id;

      const submission = await Submission.findById(submissionId);
      
      if (!submission) {
        return res.status(404).json({
          success: false,
          error: 'Submission tidak ditemukan'
        });
      }

      // Check if user owns this submission
      if (submission.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Akses ditolak'
        });
      }

      // Parse foto_urls
      const processedSubmission = {
        ...submission,
        foto_urls: JSON.parse(submission.foto_urls || '[]')
      };

      res.json({
        success: true,
        data: {
          submission: processedSubmission
        }
      });
    } catch (error) {
      logger.error('Get submission by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Cancel submission
  async cancelSubmission(req, res) {
    try {
      const submissionId = parseInt(req.params.id);
      const userId = req.user.id;

      const submission = await Submission.findById(submissionId);
      
      if (!submission) {
        return res.status(404).json({
          success: false,
          error: 'Submission tidak ditemukan'
        });
      }

      // Check if user owns this submission
      if (submission.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Akses ditolak'
        });
      }

      // Check if submission can be cancelled
      if (!['pending', 'confirmed'].includes(submission.status)) {
        return res.status(400).json({
          success: false,
          error: 'Submission tidak dapat dibatalkan'
        });
      }

      // Update submission status
      const updatedSubmission = await Submission.update(submissionId, {
        status: 'cancelled',
        cancelled_at: new Date(),
        updated_at: new Date()
      });

      logger.info(`Submission ${submissionId} cancelled by user ${userId}`);

      res.json({
        success: true,
        message: 'Submission berhasil dibatalkan',
        data: {
          submission: updatedSubmission
        }
      });
    } catch (error) {
      logger.error('Cancel submission error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Rate submission
  async rateSubmission(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const submissionId = parseInt(req.params.id);
      const userId = req.user.id;
      const { rating, review } = req.body;

      const submission = await Submission.findById(submissionId);
      
      if (!submission) {
        return res.status(404).json({
          success: false,
          error: 'Submission tidak ditemukan'
        });
      }

      // Check if user owns this submission
      if (submission.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Akses ditolak'
        });
      }

      // Check if submission is completed
      if (submission.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Hanya submission yang sudah selesai yang dapat diberi rating'
        });
      }

      // Check if already rated
      if (submission.rating) {
        return res.status(400).json({
          success: false,
          error: 'Submission sudah pernah diberi rating'
        });
      }

      // Update submission with rating
      const updatedSubmission = await Submission.update(submissionId, {
        rating: parseInt(rating),
        review: review || null,
        rated_at: new Date(),
        updated_at: new Date()
      });

      // Update bank sampah average rating
      await updateBankSampahRating(submission.bank_sampah_id);

      logger.info(`Submission ${submissionId} rated by user ${userId}: ${rating}/5`);

      res.json({
        success: true,
        message: 'Rating berhasil diberikan',
        data: {
          submission: updatedSubmission
        }
      });
    } catch (error) {
      logger.error('Rate submission error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }
}

// Helper function to generate submission code
function generateSubmissionCode() {
  const prefix = 'SUB';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Helper function to update bank sampah rating
async function updateBankSampahRating(bankSampahId) {
  try {
    const { db } = require('../config/database');
    
    const result = await db('submissions')
      .where('bank_sampah_id', bankSampahId)
      .whereNotNull('rating')
      .avg('rating as avg_rating')
      .count('* as total_reviews')
      .first();

    const avgRating = parseFloat(result.avg_rating) || 0;
    const totalReviews = parseInt(result.total_reviews) || 0;

    await BankSampah.update(bankSampahId, {
      avg_rating: avgRating,
      total_reviews: totalReviews,
      updated_at: new Date()
    });
  } catch (error) {
    logger.error('Error updating bank sampah rating:', error);
  }
}

module.exports = new SubmissionController();