const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invoicing.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'accounts', 'property_manager'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.patch('/:id/status', ctrl.setStatus);
router.post('/:id/payments', ctrl.recordPayment);

module.exports = router;
