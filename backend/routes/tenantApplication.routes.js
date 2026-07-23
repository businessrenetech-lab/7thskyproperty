const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tenantApplication.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
// NOTE: must be registered BEFORE '/:id' or Express treats "send-link" as an id.
router.post('/send-link', ctrl.sendApplicationLink);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.post('/:id/convert-to-tenancy', ctrl.convertToTenancy);
router.post('/:id/send-owner-approval', ctrl.sendOwnerApproval);
router.post('/:id/send-employer-reference', ctrl.sendEmployerReference);

// Verification checklist
router.patch('/:id/verifications/:vid', ctrl.updateVerification);

// Occupants
router.post('/:id/occupants', ctrl.addOccupant);
router.put('/:id/occupants/:oid', ctrl.updateOccupant);
router.delete('/:id/occupants/:oid', ctrl.removeOccupant);

// Documents
router.post('/:id/documents', ctrl.addDocument);

module.exports = router;
