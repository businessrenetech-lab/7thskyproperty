/**
 * publicShortTermStay.routes.js — Public Unauthenticated Express Router for Website Visitors.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const ctrl = require('../controllers/shortTermStay.controller');
const enquiryLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const availabilityLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

// Public endpoints for website visitors (no-auth required)
router.get('/listings', ctrl.getPublicListings);
router.get('/listings/:slug/availability', availabilityLimiter, ctrl.getPublicAvailability);
router.get('/listings/:slug', ctrl.getPublicListingBySlug);
router.post('/enquiries', enquiryLimiter, ctrl.createPublicEnquiry);

module.exports = router;
