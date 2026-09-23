const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/businessRegistrationLine.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

const dash = require('../controllers/businessRegistrationDashboards.controller');

// The six SOP dashboards.
router.get('/dashboards', dash.dashboards);

// Console-level list first, so it is not shadowed by /projects/:projectId/activities.
router.get('/activities', ctrl.allActivities);

router.get('/projects/:projectId/parties', ctrl.listParties);
router.post('/projects/:projectId/parties', ctrl.createParty);
router.put('/parties/:id', ctrl.updateParty);
router.delete('/parties/:id', ctrl.removeParty);

router.get('/projects/:projectId/activities', ctrl.listActivities);
router.post('/projects/:projectId/activities', ctrl.createActivity);
router.put('/activities/:id', ctrl.updateActivity);

module.exports = router;
