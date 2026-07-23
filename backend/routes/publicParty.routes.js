const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/publicParty.controller');

// Public, token-gated (no login). Rate-limited like the signing routes.
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
router.use(limiter);

// Owner approval of a tenant application
router.get('/owner-approval/:token', ctrl.viewOwnerApproval);
router.post('/owner-approval/:token/decide', ctrl.decideOwnerApproval);

// Role registration (vendor / buyer / supplier / landlord KYC intake)
router.get('/register/:token', ctrl.viewRegistration);
router.post('/register/:token', ctrl.submitRegistration);

// Public tenant application form
router.get('/apply/:token', ctrl.viewApplication);
router.post('/apply/:token', ctrl.submitApplication);

// Employer reference (fixed Yes/No questions — optional, adds credibility)
router.get('/reference/:token', ctrl.viewEmployerReference);
router.post('/reference/:token', ctrl.submitEmployerReference);

module.exports = router;
