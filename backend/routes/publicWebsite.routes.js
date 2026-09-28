/**
 * publicWebsite.routes.js — Public and Admin routes for the Seventh Sky Website.
 */
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/publicWebsite.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

/*
 * Public rate limiters.
 *
 * They key on IP, so a local end-to-end run — which sweeps four categories
 * across three listing types, then every filter — exhausts the listing budget
 * and the rest of the audit reads as a wall of failures that are really just
 * 429s. Outside production, loopback is exempt: the limits still apply in full
 * on the host, where NODE_ENV is production and the caller is never 127.0.0.1.
 */
const isLocal = (req) => {
  if (process.env.NODE_ENV === 'production') return false;
  const ip = req.ip || req.connection?.remoteAddress || '';
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip);
};

const enquiryLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, skip: isLocal });
const listingLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, skip: isLocal });

// ─── Unauthenticated Public Endpoints ─────────────────────────────────────────
router.get('/properties', listingLimiter, ctrl.getPublishedProperties);
router.get('/properties/:idOrSlug', listingLimiter, ctrl.getPropertyDetails);

router.post('/rental-enquiries', enquiryLimiter, ctrl.submitRentalEnquiry);
router.post('/sales-enquiries', enquiryLimiter, ctrl.submitSalesEnquiry);
router.post('/tenant-applications', enquiryLimiter, ctrl.submitTenantApplication);
router.post('/service-requests', enquiryLimiter, ctrl.submitServiceRequest);
router.post('/appraisals', enquiryLimiter, ctrl.submitAppraisalRequest);
router.post('/contact', enquiryLimiter, ctrl.submitContactMessage);
router.post('/offers', enquiryLimiter, ctrl.submitPropertyOffer);
router.post('/business-nda-requests', enquiryLimiter, ctrl.requestBusinessNda);
router.get('/business-details/:token', listingLimiter, ctrl.getBusinessDetailsByToken);

// Public, read-only site content (contact/footer details, branding, social,
// hero/service/card photos) — what the website renders.
router.get('/site', listingLimiter, ctrl.getSiteContent);

// ─── Authenticated Admin Website Management Endpoints ─────────────────────────
const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'hr'];
router.get('/admin/summary', authMiddleware, roleMiddleware(ROLES), ctrl.getWebsiteAdminSummary);
router.patch('/admin/properties/:id/publish', authMiddleware, roleMiddleware(ROLES), ctrl.togglePropertyWebsiteStatus);
// Site content CMS — read + edit contact/footer/branding/social/photos from admin.
router.get('/admin/content', authMiddleware, roleMiddleware(ROLES), ctrl.getAdminSiteContent);
router.put('/admin/content', authMiddleware, roleMiddleware(ROLES), ctrl.updateSiteContent);
router.post('/admin/offer-link', authMiddleware, roleMiddleware(ROLES), ctrl.createOfferLink);

module.exports = router;
