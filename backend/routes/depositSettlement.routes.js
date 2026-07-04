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
router.post('/:id/decide', ctrl.decideSettlement);
router.post('/:id/mark-refunded', ctrl.markRefunded);

module.exports = router;
