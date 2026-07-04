const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/billing.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware, roleMiddleware(['super_admin', 'branch_admin', 'accounts', 'property_manager']));

router.get('/tenant-invoices', ctrl.listTenantInvoices);
router.post('/tenant-invoices', ctrl.createTenantInvoice);
router.get('/landlord-bills', ctrl.listLandlordBills);
router.post('/landlord-bills', ctrl.createLandlordBill);
router.get('/rental-receipts', ctrl.listRentalReceipts);
router.post('/rental-receipts/generate', ctrl.generateRentalReceipts);
router.post('/rental-receipts/:id/payments', ctrl.recordRentalReceiptPayment);

module.exports = router;
