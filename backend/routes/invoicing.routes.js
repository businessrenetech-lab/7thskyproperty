const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invoicing.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'accounts', 'property_manager'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/', ctrl.list);
router.get('/agency-income', ctrl.agencyIncome);  // agency fee income summary (before /:id)
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);                 // edit header + line items
router.get('/:id/document', ctrl.document);      // HTML / PDF download
router.post('/:id/send', ctrl.sendInvoice);      // email with PDF
router.patch('/:id/status', ctrl.setStatus);
router.post('/:id/payments', ctrl.recordPayment);
// Online collection: create an SSLCommerz pay-link for this invoice (manual
// recording via /:id/payments stays available alongside it).
router.post('/:id/pay-link', require('../controllers/invoiceGateway.controller').payLink);

module.exports = router;
