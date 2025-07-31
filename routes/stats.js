// routes/stats.js - Statistics routes
const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const statsController = require('../controllers/statsController');

// Validation rules
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

const periodValidation = [
  query('period')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'yearly'])
    .withMessage('Period harus salah satu dari: daily, weekly, monthly, yearly')
];

// Routes
router.get('/user', statsController.getUserStats);
router.get('/user/history', dateRangeValidation, statsController.getUserHistory);
router.get('/user/achievements', statsController.getUserAchievements);

router.get('/environmental-impact', statsController.getEnvironmentalImpact);
router.get('/environmental-impact/history', dateRangeValidation, periodValidation, statsController.getEnvironmentalImpactHistory);

router.get('/leaderboard', 
  query('limit').optional().isInt({ min: 5, max: 100 }).withMessage('Limit harus antara 5-100'),
  statsController.getLeaderboard
);

router.get('/monthly-summary', 
  query('year').optional().isInt({ min: 2020, max: 2030 }).withMessage('Tahun tidak valid'),
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Bulan harus antara 1-12'),
  statsController.getMonthlySummary
);

router.get('/waste-types/popular', statsController.getPopularWasteTypes);
router.get('/bank-sampah/top', statsController.getTopBankSampah);

router.get('/system/overview', statsController.getSystemOverview);
router.get('/trends', dateRangeValidation, periodValidation, statsController.getTrends);

module.exports = router;