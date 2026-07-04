const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tenant.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware, ctrl.requireTenant);

router.get('/me', ctrl.me);
router.get('/tenancy', ctrl.myTenancy);
router.get('/invoices', ctrl.invoices);
router.get('/invoices/:id', ctrl.invoiceDetail);
router.get('/receipts', ctrl.receipts);
router.post('/payment-proof', ctrl.submitPaymentProof);
router.get('/work-orders', ctrl.myWorkOrders);
router.post('/work-orders', ctrl.submitWorkOrder);
router.get('/documents', ctrl.documents);
router.post('/vacancy-notice', ctrl.submitVacancyNotice);
router.get('/renewal-offer', ctrl.myRenewalOffer);
router.post('/renewal-offer/accept', ctrl.acceptRenewal);
router.get('/messages', ctrl.messages);
router.post('/messages', ctrl.sendMessage);

module.exports = router;
