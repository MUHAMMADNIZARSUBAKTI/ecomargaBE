// controllers/bankSampahController.js - Bank Sampah controller
const { validationResult } = require('express-validator');
const { BankSampah } = require('../models');
const logger = require('../utils/logger');
const { getPaginationInfo, calculateDistance } = require('../utils/helpers');

class BankSampahController {
  // Get all bank sampah
  async getAllBankSampah(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const kota = req.query.kota;
      const search = req.query.search;
      const is_partner = req.query.is_partner;

      const filters = { is_active: true };
      if (kota) filters.kota = kota;
      if (search) filters.search = search;
      if (is_partner !== undefined) filters.is_partner = is_partner === 'true';

      const bankSampah = await BankSampah.findAll(filters, { page, limit });
      const totalCount = await BankSampah.count(filters);

      const pagination = getPaginationInfo(page, limit, totalCount);

      res.json({
        success: true,
        data: {
          bank_sampah: bankSampah,
          pagination
        }
      });
    } catch (error) {
      logger.error('Get all bank sampah error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Get nearby bank sampah
  async getNearbyBankSampah(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const lat = parseFloat(req.query.lat);
      const lng = parseFloat(req.query.lng);
      const radius = parseFloat(req.query.radius) || 10; // Default 10km
      const limit = parseInt(req.query.limit) || 20;

      const nearbyBankSampah = await BankSampah.findNearby(lat, lng, radius, limit);

      res.json({
        success: true,
        data: {
          bank_sampah: nearbyBankSampah,
          query: {
            latitude: lat,
            longitude: lng,
            radius: radius
          }
        }
      });
    } catch (error) {
      logger.error('Get nearby bank sampah error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Get bank sampah by ID
  async getBankSampahById(req, res) {
    try {
      const bankSampahId = parseInt(req.params.id);
      
      const bankSampah = await BankSampah.findById(bankSampahId);
      
      if (!bankSampah) {
        return res.status(404).json({
          success: false,
          error: 'Bank sampah tidak ditemukan'
        });
      }

      // Parse JSON fields
      const processedBankSampah = {
        ...bankSampah,
        koordinat: bankSampah.koordinat ? JSON.parse(bankSampah.koordinat) : null,
        jam_operasional: bankSampah.jam_operasional ? JSON.parse(bankSampah.jam_operasional) : null,
        jenis_sampah_diterima: bankSampah.jenis_sampah_diterima ? JSON.parse(bankSampah.jenis_sampah_diterima) : []
      };

      res.json({
        success: true,
        data: {
          bank_sampah: processedBankSampah
        }
      });
    } catch (error) {
      logger.error('Get bank sampah by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Get available cities
  async getAvailableCities(req, res) {
    try {
      const cities = await BankSampah.getAvailableCities();
      
      res.json({
        success: true,
        data: {
          cities
        }
      });
    } catch (error) {
      logger.error('Get available cities error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Get top bank sampah (by rating)
  async getTopBankSampah(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 5;
      
      const topBankSampah = await BankSampah.getTopBankSampah(limit);
      
      // Process each bank sampah
      const processedBankSampah = topBankSampah.map(bank => ({
        ...bank,
        koordinat: bank.koordinat ? JSON.parse(bank.koordinat) : null,
        jam_operasional: bank.jam_operasional ? JSON.parse(bank.jam_operasional) : null,
        jenis_sampah_diterima: bank.jenis_sampah_diterima ? JSON.parse(bank.jenis_sampah_diterima) : []
      }));

      res.json({
        success: true,
        data: {
          bank_sampah: processedBankSampah
        }
      });
    } catch (error) {
      logger.error('Get top bank sampah error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Get waste prices for a bank sampah
  async getWastePrices(req, res) {
    try {
      const bankSampahId = parseInt(req.params.id);
      
      // Check if bank sampah exists
      const bankSampah = await BankSampah.findById(bankSampahId);
      if (!bankSampah) {
        return res.status(404).json({
          success: false,
          error: 'Bank sampah tidak ditemukan'
        });
      }

      const wastePrices = await BankSampah.getWastePrices(bankSampahId);
      
      res.json({
        success: true,
        data: {
          bank_sampah: {
            id: bankSampah.id,
            nama: bankSampah.nama
          },
          waste_prices: wastePrices
        }
      });
    } catch (error) {
      logger.error('Get waste prices error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }

  // Get bank sampah statistics
  async getBankSampahStats(req, res) {
    try {
      const bankSampahId = parseInt(req.params.id);
      
      // Check if bank sampah exists
      const bankSampah = await BankSampah.findById(bankSampahId);
      if (!bankSampah) {
        return res.status(404).json({
          success: false,
          error: 'Bank sampah tidak ditemukan'
        });
      }

      const stats = await BankSampah.getStats(bankSampahId);
      
      res.json({
        success: true,
        data: {
          bank_sampah: {
            id: bankSampah.id,
            nama: bankSampah.nama
          },
          stats
        }
      });
    } catch (error) {
      logger.error('Get bank sampah stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server'
      });
    }
  }
}

module.exports = new BankSampahController();