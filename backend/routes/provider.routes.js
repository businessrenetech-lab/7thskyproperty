const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/provider.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.post('/:id/compliance', ctrl.addCompliance);
router.delete('/:id/compliance/:complianceId', ctrl.removeCompliance);
router.post('/:id/portal-access', ctrl.enablePortal);

module.exports = router;
