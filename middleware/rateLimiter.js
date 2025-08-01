// middleware/rateLimiter.js - Rate limiting middleware
const rateLimit = require("express-rate-limit");

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: "Terlalu banyak request",
    message: "Anda telah mencapai batas maksimal request. Coba lagi nanti.",
    retry_after: "15 minutes",
  },
});

// Submission-specific rate limiter
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 submissions per 15 minutes per user
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Terlalu banyak submission",
    message:
      "Anda telah mencapai batas maksimal submission. Coba lagi dalam 15 menit.",
    retry_after: "15 minutes",
  },
  // Use user ID if authenticated, otherwise IP
  keyGenerator: (req) => {
    return req.user?.id ? `user_${req.user.id}` : req.ip;
  },
});

// Auth rate limiter (login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 auth attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Terlalu banyak percobaan login",
    message:
      "Anda telah melakukan terlalu banyak percobaan login. Coba lagi dalam 15 menit.",
    retry_after: "15 minutes",
  },
  keyGenerator: (req) => {
    return req.body?.email || req.ip;
  },
});

// Strict auth limiter for password attempts
const strictAuthLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 failed attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Akun diblokir sementara",
    message:
      "Terlalu banyak percobaan login gagal. Akun diblokir selama 1 jam.",
    retry_after: "1 hour",
  },
  keyGenerator: (req) => {
    return req.body?.email || req.ip;
  },
});

// Password reset rate limiter
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 password reset attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Terlalu banyak permintaan reset password",
    message:
      "Anda telah mencapai batas maksimal permintaan reset password per jam.",
    retry_after: "1 hour",
  },
  keyGenerator: (req) => {
    return req.body?.email || req.ip;
  },
});

// File upload rate limiter
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Max 30 file uploads per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Terlalu banyak upload file",
    message:
      "Anda telah mencapai batas maksimal upload file. Coba lagi dalam 15 menit.",
    retry_after: "15 minutes",
  },
  keyGenerator: (req) => {
    return req.user?.id ? `user_${req.user.id}` : req.ip;
  },
});

// Admin operations rate limiter
const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Max 50 admin operations per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Terlalu banyak operasi admin",
    message:
      "Anda telah mencapai batas maksimal operasi admin. Coba lagi dalam 5 menit.",
    retry_after: "5 minutes",
  },
  keyGenerator: (req) => {
    return req.user?.id ? `admin_${req.user.id}` : req.ip;
  },
});

// Search rate limiter
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Max 30 searches per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Terlalu banyak pencarian",
    message: "Anda telah mencapai batas maksimal pencarian per menit.",
    retry_after: "1 minute",
  },
});

// Email sending rate limiter
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 emails per hour per IP/user
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Terlalu banyak email",
    message: "Anda telah mencapai batas maksimal pengiriman email per jam.",
    retry_after: "1 hour",
  },
  keyGenerator: (req) => {
    return req.body?.email || req.user?.email || req.ip;
  },
});

module.exports = {
  generalLimiter,
  submissionLimiter,
  authLimiter,
  strictAuthLimiter,
  passwordResetLimiter,
  uploadLimiter,
  adminLimiter,
  searchLimiter,
  emailLimiter,
};
