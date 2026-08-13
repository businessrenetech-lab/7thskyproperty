/**
 * wtPortalSession.routes.js — the portal for a party who has a real login.
 * Mounted at /api/wt-portal. Authenticated, unlike the token routes.
 *
 * `portalOnly` is the guard that matters: these endpoints resolve the caller to
 * a provider or client through `portal_user_id`, so a staff account reaching
 * them would resolve to nobody. Refusing by role up front turns that into a
 * clear 403 rather than a confusing "not linked" error, and makes it obvious
 * that this router is not another way into the admin API.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const { PORTAL_ROLES } = require('../services/wtPortalAccount.service');
const upload = require('../utils/uploadAny');
const ctrl = require('../controllers/publicWtPortal.controller');

router.use(authMiddleware);
const portalOnly = roleMiddleware(PORTAL_ROLES);

router.get('/me', portalOnly, ctrl.sessionView);
router.get('/invoices/:code/pdf', portalOnly, ctrl.sessionInvoicePdf);
router.get('/photo', portalOnly, ctrl.sessionPhoto);

// Provider actions
router.post('/work-orders/:code/respond', portalOnly, ctrl.sessionRespond);
router.post('/work-orders/:code/schedule', portalOnly, ctrl.sessionSchedule);
router.post('/work-orders/:code/start', portalOnly, ctrl.sessionStart);
router.post('/work-orders/:code/complete', portalOnly, ctrl.sessionComplete);
router.post('/work-orders/:code/photos', portalOnly,
  (req, res, next) => { req.uploadFolder = 'documents'; next(); },
  upload.single('file'), ctrl.sessionUploadPhoto);

// Client actions
router.post('/quotations/:code/decision', portalOnly, ctrl.sessionQuotationDecision);

// Either
router.post('/message', portalOnly, ctrl.sessionMessage);
router.post('/complaint', portalOnly, ctrl.sessionComplaint);

module.exports = router;
