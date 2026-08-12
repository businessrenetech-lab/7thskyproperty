/**
 * waterTankProviders.routes.js — SSPC-WTCM-SOP-02 endpoints.
 * Fixed paths are declared before the /:id family so they aren't swallowed.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/waterTankProviders.controller');

router.use(authMiddleware);
const MANAGE = roleMiddleware(['super_admin', 'branch_admin', 'property_manager', 'staff']);
const APPROVE = roleMiddleware(['super_admin', 'branch_admin', 'property_manager', 'accounts']);

// reference data + watchtower
router.get('/reference', ctrl.reference);
router.get('/alerts', ctrl.alerts);
router.get('/directory', ctrl.directory);
router.get('/lookup', ctrl.lookup);
router.post('/', MANAGE, ctrl.create);

// Sec. 5 Steps 2 & 3 — compliance + insurance registers
router.get('/documents', ctrl.listDocuments);
router.post('/documents', ctrl.saveDocument);
router.post('/documents/:id/verify', ctrl.verifyDocument);
router.delete('/documents/:id', ctrl.deleteDocument);

// Sec. 14 — audits
router.get('/audits', ctrl.listAudits);
router.post('/audits', ctrl.createAudit);
router.patch('/audits/:id', ctrl.updateAudit);
router.delete('/audits/:id', ctrl.deleteAudit);

// Sec. 8 Step 10 — provider reporting
router.get('/reports', ctrl.listReports);
router.post('/reports', ctrl.createReport);
router.patch('/reports/:id', ctrl.updateReport);
router.delete('/reports/:id', ctrl.deleteReport);

// Sec. 12 — protected clients / non-circumvention
router.get('/protected/check', ctrl.checkProtected);
router.get('/protected', ctrl.listProtected);
router.post('/protected', ctrl.createProtected);
router.patch('/protected/:id', ctrl.updateProtected);
router.delete('/protected/:id', ctrl.deleteProtected);

// one provider's own dashboard + lifecycle actions
router.get('/:id', ctrl.detail);
router.patch('/:id', MANAGE, ctrl.updateProfile);
router.post('/:id/invite', MANAGE, ctrl.invite);
router.post('/:id/payment-verification', APPROVE, ctrl.verifyPayment);
router.post('/:id/stage', ctrl.setStage);
router.post('/:id/capability', ctrl.assessCapability);
router.post('/:id/territory-briefing', ctrl.territoryBriefing);
router.post('/:id/agreement', ctrl.recordAgreement);
router.post('/:id/sanction', ctrl.sanction);
router.post('/:id/renewal', ctrl.renewal);
router.post('/:id/breach', ctrl.logBreach);

module.exports = router;
