/**
 * waterTankWorkOrder.routes.js — work order dashboard and lifecycle.
 * Mounted at /api/wt-work-orders.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/waterTankWorkOrder.controller');

router.use(authMiddleware);

router.get('/reference', ctrl.reference);
router.get('/document/reference', ctrl.documentReference);   // before /:id
router.get('/', ctrl.list);
router.get('/:id', ctrl.detail);
router.patch('/:id', ctrl.update);

// SSPC-WTCM-PWO-01 project work order document
router.get('/:id/document', ctrl.document);
router.get('/:id/document/pdf', ctrl.documentPdf);
router.patch('/:id/document', ctrl.saveDocument);
router.post('/:id/document/sync-quotation', ctrl.syncQuotation);
router.post('/:id/document/send', ctrl.sendDocument);
router.post('/:id/document/void', ctrl.voidDocument);

// lifecycle
router.post('/:id/assign', ctrl.assign);
router.post('/:id/accept', ctrl.accept);
router.post('/:id/decline', ctrl.decline);
router.post('/:id/schedule', ctrl.schedule);
router.post('/:id/start', ctrl.start);
router.post('/:id/complete', ctrl.complete);
router.post('/:id/verify', ctrl.verify);

module.exports = router;
