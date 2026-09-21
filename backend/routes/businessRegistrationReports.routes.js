const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/businessRegistrationReports.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/overview', ctrl.overview);

module.exports = router;
