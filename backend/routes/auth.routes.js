const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

// C2 Fix: Rate limiting on login to prevent brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15-minute window
  max: 1000,                     // 1000 attempts per window per IP
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
router.post('/google', loginLimiter, authController.googleLogin);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.getMe);
router.get('/staff', authMiddleware, roleMiddleware(['super_admin', 'branch_admin']), authController.getStaff);
router.patch('/role', authMiddleware, roleMiddleware(['super_admin', 'branch_admin']), authController.updateRole);
router.patch('/staff-password', authMiddleware, roleMiddleware(['super_admin', 'branch_admin']), authController.setStaffPassword);

// Password self-service, rate limited by purpose rather than with one number.
//
// forgot-password SENDS MAIL, so it is the one worth throttling: unthrottled it
// is a way to bombard an address. But the limit is per IP and a whole office
// sits behind one NAT address, so it has to be loose enough that a handful of
// colleagues resetting on the same morning do not lock each other out. Ten an
// hour was too tight for that; twenty is not.
//
// Protection against ACCOUNT ENUMERATION comes from the identical response, not
// from this limit — see forgotPassword.
const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Too many password reset requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// reset-password sends nothing and already requires a valid single-use token,
// so this only needs to stop brute-forcing the token itself.
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: { error: 'Too many attempts. Please request a new reset link.' },
  standardHeaders: true,
  legacyHeaders: false,
});
router.post('/forgot-password', forgotLimiter, authController.forgotPassword);
router.post('/reset-password', resetLimiter, authController.resetPassword);
router.post('/change-password', authMiddleware, authController.changePassword);

module.exports = router;
