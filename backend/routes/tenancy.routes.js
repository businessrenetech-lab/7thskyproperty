const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tenancy.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/global-invoices', ctrl.globalInvoices);
router.post('/global-invoices', ctrl.globalInvoices);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.post('/:id/start-agreement', ctrl.startAgreement);
router.post('/:id/raise-invoice', ctrl.raiseInvoice);
router.post('/bulk-raise-invoices', ctrl.bulkRaiseInvoices);

// Renewal lifecycle (Phase 7) + agreement signing (role-gate)
const lifecycleCtrl = require('../controllers/tenancyLifecycle.controller');
router.post('/:id/send-agreement', lifecycleCtrl.sendTenancyAgreement);
router.post('/:id/renewal/propose', lifecycleCtrl.proposeRenewal);
router.post('/:id/renewal/decide', lifecycleCtrl.decideRenewal);
router.post('/:id/renewal/tenant-accept', lifecycleCtrl.tenantAcceptRenewal);
router.post('/:id/renewal/activate', lifecycleCtrl.activateRenewal);

module.exports = router;
