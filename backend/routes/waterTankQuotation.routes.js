/**
 * waterTankQuotation.routes.js — quotation builder, document and delivery.
 * Mounted at /api/wt-quotes.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/waterTankQuotation.controller');

router.use(authMiddleware);

// build a quotation from a site assessment
// Direct quotation (Sec. 7 Step 5 — no site assessment behind it).
router.get('/agreement-position', ctrl.agreementPosition);
router.post('/direct', ctrl.createDirect);

router.get('/builder/:assessmentId', ctrl.builder);
router.post('/from-assessment/:assessmentId', ctrl.save);

// the document and its delivery.
// The PDF arrives base64-encoded in the body, which blows past the global 2 MB
// JSON limit, so this one route gets its own parser.
router.get('/:id/document', ctrl.document);
router.get('/:id/email-preview', ctrl.emailPreview);
router.post('/:id/send', express.json({ limit: '25mb' }), ctrl.send);

// hand-off to the Customer Service Agreement (built by /wt-agreements/customer)
router.get('/:id/agreement-draft', ctrl.agreementDraft);
router.post('/:id/link-agreement', ctrl.linkAgreement);

module.exports = router;
