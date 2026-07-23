const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/partyRoleProfile.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/', ctrl.list);
router.get('/landlord-prefill', ctrl.landlordPrefill);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.post('/:id/agreement/reopen', ctrl.reopenAgreement);
router.put('/:id/agreement/draft', ctrl.updateAgreementDraft);
router.post('/:id/start-signing', ctrl.startSigning);
// Pull the contact's previously verified KYC into this profile.
router.post('/:id/kyc-reuse', ctrl.reuseKyc);
router.post('/:id/registration-link', ctrl.registrationLink);
router.delete('/:id', ctrl.archive);

module.exports = router;
