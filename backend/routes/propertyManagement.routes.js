const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/propertyManagement.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/action-center', ctrl.actionCenter);

// Renewals dashboard (Phase 7)
const lifecycleCtrl = require('../controllers/tenancyLifecycle.controller');
router.get('/renewals', lifecycleCtrl.renewalsDashboard);

module.exports = router;
