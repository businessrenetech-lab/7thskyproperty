const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/businessNda.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/', ctrl.list);
router.post('/:id/approve', ctrl.approve);
router.post('/:id/release', ctrl.release);
router.post('/:id/decline', ctrl.decline);

module.exports = router;
