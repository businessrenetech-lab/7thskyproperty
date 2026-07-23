const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/disbursement.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

// Owner
router.get('/owner-balances', ctrl.ownerBalances);
router.get('/owner/:ownerId/preview', ctrl.previewOwner);
router.post('/owner', ctrl.payOwner);
router.get('/owner', ctrl.listOwnerDisbursements);

// Supplier + tenant
router.post('/supplier', ctrl.paySupplier);
router.post('/tenant', ctrl.refundTenant);
router.post('/tenant-personal-payment', ctrl.tenantPersonalPayment);
router.get('/tenant/:tenancyId/outstanding', ctrl.tenantOutstanding);

// PM income ledger
router.get('/income', ctrl.listIncome);

module.exports = router;
