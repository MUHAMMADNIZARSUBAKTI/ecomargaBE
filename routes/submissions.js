// routes/submissions.js - Submission routes
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const submissionController = require('../controllers/submissionController');
const upload = require('../middleware/upload');
const { submissionLimiter } = require('../middleware/rateLimiter');

// Validation rules
const createSubmissionValidation = [
  body('waste_type_id')
    .isInt({ min: 1 })
    .withMessage('Jenis sampah wajib dipilih'),
  
  body('bank_sampah_id')
    .isInt({ min: 1 })
    .withMessage('Bank sampah wajib dipilih'),
  
  body('berat')
    .isFloat({ min: 0.1, max: 1000 })
    .withMessage('Berat sampah harus antara 0.1 - 1000 kg'),
  
  body('deskripsi')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Deskripsi maksimal 500 karakter')
];

const rateSubmissionValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating harus antara 1-5'),
  
  body('review')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Review maksimal 1000 karakter')
];

// Routes
router.post('/', 
  submissionLimiter, 
  upload.array('photos', 5), 
  createSubmissionValidation, 
  submissionController.createSubmission
);

router.get('/', submissionController.getUserSubmissions);
router.get('/:id', submissionController.getSubmissionById);
router.put('/:id/cancel', submissionController.cancelSubmission);
router.post('/:id/rate', rateSubmissionValidation, submissionController.rateSubmission);

module.exports = router;