const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/client.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const CRM_ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts'];

router.use(authMiddleware);
router.use(roleMiddleware(CRM_ROLES));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.post('/:id/communications', ctrl.addCommunication);
router.post('/:id/portal-access', ctrl.enablePortal);

module.exports = router;
