/**
 * waterTankWorkOrder.routes.js — work order dashboard and lifecycle.
 * Mounted at /api/wt-work-orders.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead, canOperate, canTransact, canBind, canAdminister } = require('../middleware/wtRoles');
const ctrl = require('../controllers/waterTankWorkOrder.controller');

router.use(authMiddleware);

router.get('/reference', canRead, ctrl.reference);
router.get('/document/reference', canRead, ctrl.documentReference);   // before /:idrouter.get('/', canRead, ctrl.list);
router.get('/:id', canRead, ctrl.detail);
router.patch('/:id', canOperate, ctrl.update);
// SSPC-WTCM-PWO-01 project work order document
router.get('/:id/document', canRead, ctrl.document);
router.get('/:id/document/pdf', canRead, ctrl.documentPdf);
router.patch('/:id/document', canOperate, ctrl.saveDocument);
router.post('/:id/document/sync-quotation', canOperate, ctrl.syncQuotation);
router.post('/:id/document/send', canBind, ctrl.sendDocument);
router.post('/:id/document/void', canOperate, ctrl.voidDocument);
// lifecycle
router.post('/:id/assign', canOperate, ctrl.assign);
router.post('/:id/accept', canOperate, ctrl.accept);
router.post('/:id/decline', canOperate, ctrl.decline);
router.post('/:id/schedule', canOperate, ctrl.schedule);
router.post('/:id/start', canOperate, ctrl.start);
router.post('/:id/complete', canOperate, ctrl.complete);
router.post('/:id/verify', canOperate, ctrl.verify);

module.exports = router;
