const express = require('express');

const router = express.Router();
const ctrl = require('../controllers/ruralSaleDashboards.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/dashboards/:key', ctrl.dashboard);

module.exports = router;
