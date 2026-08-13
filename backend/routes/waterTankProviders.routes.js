/**
 * waterTankProviders.routes.js — SSPC-WTCM-SOP-02 endpoints.
 * Fixed paths are declared before the /:id family so they aren't swallowed.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const { canRead, canOperate, canAdminister } = require('../middleware/wtRoles');
const upload = require('../utils/uploadAny');
const ctrl = require('../controllers/waterTankProviders.controller');

router.use(authMiddleware);
// This file predates wtRoles and carries its own two guards. They are kept
// because they are narrower than the shared tiers for these specific actions:
// APPROVE additionally admits accounts, who verify payment details.
const MANAGE = roleMiddleware(['super_admin', 'branch_admin', 'property_manager', 'staff']);
const APPROVE = roleMiddleware(['super_admin', 'branch_admin', 'property_manager', 'accounts']);

// reference data + watchtower
router.get('/reference', canRead, ctrl.reference);
router.get('/alerts', canRead, ctrl.alerts);
router.get('/directory', canRead, ctrl.directory);
router.get('/lookup', canRead, ctrl.lookup);
router.post('/', canOperate, MANAGE, ctrl.create);
// Sec. 5 Steps 2 & 3 — compliance + insurance registers
router.get('/documents', canRead, ctrl.listDocuments);
router.post('/documents', canOperate, ctrl.saveDocument);
router.post('/documents/:id/verify', canOperate, ctrl.verifyDocument);
router.delete('/documents/:id', canAdminister, ctrl.deleteDocument);
// Sec. 14 — audits
router.get('/audits', canRead, ctrl.listAudits);
router.post('/audits', canOperate, ctrl.createAudit);
router.patch('/audits/:id', canOperate, ctrl.updateAudit);
router.delete('/audits/:id', canAdminister, ctrl.deleteAudit);
// Sec. 8 Step 10 — provider reporting
// Reference + job lookup must precede /reports/:id so they are not swallowed.
router.get('/reports/reference', canRead, ctrl.reportReference);
router.get('/reports/jobs', canRead, ctrl.reportJobs);
router.get('/reports', canRead, ctrl.listReports);
router.post('/reports', canOperate, ctrl.createReport);
router.patch('/reports/:id', canOperate, ctrl.updateReport);
router.delete('/reports/:id', canAdminister, ctrl.deleteReport);
router.post('/reports/upload', canOperate,
  (req, res, next) => { req.uploadFolder = 'documents'; next(); },
  upload.single('file'), ctrl.reportUpload);
// Sec. 12 — protected clients / non-circumvention
router.get('/protected/check', canRead, ctrl.checkProtected);
router.get('/protected', canRead, ctrl.listProtected);
router.post('/protected', canOperate, ctrl.createProtected);
router.patch('/protected/:id', canOperate, ctrl.updateProtected);
router.delete('/protected/:id', canAdminister, ctrl.deleteProtected);
// one provider's own dashboard + lifecycle actions
router.get('/:id', canRead, ctrl.detail);
router.patch('/:id', canOperate, MANAGE, ctrl.updateProfile);
router.post('/:id/invite', canOperate, MANAGE, ctrl.invite);
router.post('/:id/payment-verification', canOperate, APPROVE, ctrl.verifyPayment);
router.post('/:id/stage', canOperate, ctrl.setStage);
router.post('/:id/capability', canOperate, ctrl.assessCapability);
router.post('/:id/territory-briefing', canOperate, ctrl.territoryBriefing);
router.post('/:id/agreement', canOperate, ctrl.recordAgreement);
router.post('/:id/sanction', canOperate, ctrl.sanction);
router.post('/:id/renewal', canOperate, ctrl.renewal);
router.post('/:id/breach', canOperate, ctrl.logBreach);

module.exports = router;
