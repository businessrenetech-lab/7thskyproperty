const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/businessReports.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/overview', ctrl.overview);
router.get('/buy-overview', ctrl.buyOverview);

module.exports = router;
