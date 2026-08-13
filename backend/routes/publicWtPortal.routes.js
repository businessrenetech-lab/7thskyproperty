/**
 * publicWtPortal.routes.js — provider and customer portals.
 * Mounted at /api/public/wt-portal. NO authMiddleware: the token is the credential.
 *
 * Two rate limits rather than one. Reads are generous, because a portal page
 * makes several and a provider refreshing on site should never be locked out.
 * Writes are tight, because they change the state of real jobs and money — and
 * because a tight limit on a public write endpoint is the cheapest defence
 * against someone hammering it with guessed tokens.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const upload = require('../utils/uploadAny');
const ctrl = require('../controllers/publicWtPortal.controller');

const readLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment and try again.' },
});
const writeLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment and try again.' },
});

router.get('/:token', readLimit, ctrl.view);
router.get('/:token/invoices/:code/pdf', readLimit, ctrl.invoicePdf);

// Provider — their own steps, previously taken for them over the telephone.
router.post('/:token/work-orders/:code/respond', writeLimit, ctrl.respond);
router.post('/:token/work-orders/:code/schedule', writeLimit, ctrl.schedule);
router.post('/:token/work-orders/:code/start', writeLimit, ctrl.start);
router.post('/:token/work-orders/:code/complete', writeLimit, ctrl.complete);
router.post('/:token/work-orders/:code/signing-link', writeLimit, ctrl.signingLink);
// A phone camera straight into the job record. Forced into the private,
// JWT-gated documents folder — site photos can show a client’s premises.
router.post('/:token/work-orders/:code/photos', writeLimit,
  (req, res, next) => { req.uploadFolder = 'documents'; next(); },
  upload.single('file'), ctrl.uploadPhoto);

// Customer — accepting their own quotation rather than telling someone to.
router.post('/:token/quotations/:code/decision', writeLimit, ctrl.quotationDecision);

// Either party, writing back without needing an email thread.
router.post('/:token/message', writeLimit, ctrl.message);

module.exports = router;
