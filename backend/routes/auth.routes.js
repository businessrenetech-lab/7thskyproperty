const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

// C2 Fix: Rate limiting on login to prevent brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15-minute window
  max: 10,                     // 10 attempts per window per IP
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
});

// C2 Fix: Rate limiting on registration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1-hour window
  max: 20,                     // 20 registrations per hour per IP
  message: { error: 'Registration limit reached. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', registerLimiter, authMiddleware, roleMiddleware(['super_admin', 'branch_admin']), authController.register);
router.post('/login', loginLimiter, authController.login);
router.get('/me', authMiddleware, authController.getMe);
router.get('/staff', authMiddleware, roleMiddleware(['super_admin', 'branch_admin']), authController.getStaff);
router.patch('/role', authMiddleware, roleMiddleware(['super_admin', 'branch_admin']), authController.updateRole);
router.patch('/staff-password', authMiddleware, roleMiddleware(['super_admin', 'branch_admin']), authController.setStaffPassword);

module.exports = router;
