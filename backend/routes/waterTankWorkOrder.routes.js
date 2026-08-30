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
router.get('/document/reference', canRead, ctrl.documentReference);   // before /:id
router.get('/', canRead, ctrl.list);
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
router.post('/:id/raise-invoice', canOperate, ctrl.raiseInvoice);
// Provider payouts — moved here from the unguarded generic /wt-ops router, and
// written through the single money ledger. Recording one is a finance action;
// reversing one is a correction to the books and stays with administrators.
router.get('/:id/actions', canRead, ctrl.actions);
router.get('/:id/payouts', canRead, ctrl.payoutHistory);
router.post('/:id/pay-provider', canTransact, ctrl.payProvider);
router.post('/:id/pay-provider/:eventId/reverse', canAdminister, ctrl.reversePayout);

module.exports = router;
