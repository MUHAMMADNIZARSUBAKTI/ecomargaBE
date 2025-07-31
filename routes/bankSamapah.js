// routes/bankSampah.js - Bank Sampah routes
const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const bankSampahController = require('../controllers/bankSampahController');
const { optionalAuth } = require('../middleware/auth');

// Validation rules
const nearbyValidation = [
  query('lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude harus antara -90 dan 90'),
  
  query('lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude harus antara -180 dan 180'),
  
  query('radius')
    .optional()
    .isFloat({ min: 1, max: 50 })
    .withMessage('Radius harus antara 1-50 km')
];

const searchValidation = [
  query('kota')
    .optional()
    .isLength({ min: 2 })
    .withMessage('Nama kota minimal 2 karakter'),
  
  query('search')
    .optional()
    .isLength({ min: 2 })
    .withMessage('Kata pencarian minimal 2 karakter')
];

// Routes (some are public, some require auth)
router.get('/', optionalAuth, searchValidation, bankSampahController.getAllBankSampah);
router.get('/nearby', nearbyValidation, bankSampahController.getNearbyBankSampah);
router.get('/cities', bankSampahController.getAvailableCities);
router.get('/top', bankSampahController.getTopBankSampah);

router.get('/:id', optionalAuth, bankSampahController.getBankSampahById);
router.get('/:id/prices', bankSampahController.getWastePrices);
router.get('/:id/stats', bankSampahController.getBankSampahStats);

module.exports = router;