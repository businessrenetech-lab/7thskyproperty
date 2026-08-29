/**
 * waterTankQuotation.routes.js — quotation builder, document and delivery.
 * Mounted at /api/wt-quotes.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead, canOperate, canTransact, canBind, canAdminister } = require('../middleware/wtRoles');
const ctrl = require('../controllers/waterTankQuotation.controller');

router.use(authMiddleware);

// There is no quotation collection on this router — the list is served by the
// register at /api/wt-ops/quotations. Answer the bare path with a JSON 404 so a
// stray GET /wt-quotes returns an honest error instead of falling through to the
// SPA's index.html (which any caller would then try to JSON.parse).
router.get('/', canRead, (req, res) => res.status(404).json({
  error: 'No quotation collection here. Use GET /api/wt-ops/quotations for the list.',
}));

// build a quotation from a site assessment
// Direct quotation (Sec. 7 Step 5 — no site assessment behind it).
router.get('/agreement-position', canRead, ctrl.agreementPosition);
router.post('/direct', canOperate, ctrl.createDirect);
router.get('/builder/:assessmentId', canRead, ctrl.builder);
router.post('/from-assessment/:assessmentId', canOperate, ctrl.save);
// the document and its delivery.
// The PDF arrives base64-encoded in the body, which blows past the global 2 MB
// JSON limit, so this one route gets its own parser.
router.get('/:id/document', canRead, ctrl.document);
router.get('/:id/email-preview', canRead, ctrl.emailPreview);
router.post('/:id/send', canBind, express.json({ limit: '25mb' }), ctrl.send);
// hand-off to the Customer Service Agreement (built by /wt-agreements/customer)
// Named lifecycle actions, replacing the generic /wt-ops PATCH and DELETE.
router.post('/:id/decision', canOperate, ctrl.setDecision);
router.delete('/:id', canAdminister, ctrl.removeQuotation);

router.get('/:id/agreement-draft', canRead, ctrl.agreementDraft);
router.post('/:id/link-agreement', canBind, ctrl.linkAgreement);

module.exports = router;
