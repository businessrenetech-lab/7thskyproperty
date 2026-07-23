const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tenancyLifecycle.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/', ctrl.listSettlements);
router.post('/', ctrl.createSettlement);
router.post('/preview', ctrl.previewSettlement);
router.get('/:id', ctrl.getSettlement);
router.post('/:id/recompute', ctrl.recomputeSettlement);
// Three-step control: submit → independent review → approval → final lock.
router.post('/:id/submit', ctrl.submitSettlement);
router.post('/:id/review', ctrl.reviewSettlement);
router.post('/:id/approve', ctrl.approveSettlement);
router.post('/:id/reopen', ctrl.reopenSettlement); // recall to draft — voids review + approval
router.post('/:id/decide', ctrl.decideSettlement); // the owner's external sign-off/dispute
router.post('/:id/mark-refunded', ctrl.markRefunded); // final lock — moves the money

module.exports = router;
