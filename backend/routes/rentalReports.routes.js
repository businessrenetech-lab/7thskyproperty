const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rentalReports.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/overview', ctrl.overview);
router.get('/occupancy', ctrl.occupancy);
router.get('/rent-roll', ctrl.rentRoll);
router.get('/arrears-aging', ctrl.arrearsAging);
router.get('/collection-rate', ctrl.collectionRate);
router.get('/maintenance-cost', ctrl.maintenanceCost);
router.get('/expiring-leases', ctrl.expiringLeases);
router.get('/application-funnel', ctrl.applicationFunnel);
router.get('/avg-days-to-rent', ctrl.avgDaysToRent);

module.exports = router;
