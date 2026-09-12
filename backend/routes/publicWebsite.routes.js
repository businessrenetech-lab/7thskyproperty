/**
 * publicWebsite.routes.js — Public and Admin routes for the Seventh Sky Website.
 */
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/publicWebsite.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

// Public rate limiters
const enquiryLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
const listingLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });

// ─── Unauthenticated Public Endpoints ─────────────────────────────────────────
router.get('/properties', listingLimiter, ctrl.getPublishedProperties);
router.get('/properties/:idOrSlug', listingLimiter, ctrl.getPropertyDetails);

router.post('/rental-enquiries', enquiryLimiter, ctrl.submitRentalEnquiry);
router.post('/sales-enquiries', enquiryLimiter, ctrl.submitSalesEnquiry);
router.post('/tenant-applications', enquiryLimiter, ctrl.submitTenantApplication);
router.post('/service-requests', enquiryLimiter, ctrl.submitServiceRequest);
router.post('/appraisals', enquiryLimiter, ctrl.submitAppraisalRequest);
router.post('/contact', enquiryLimiter, ctrl.submitContactMessage);

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

module.exports = router;
