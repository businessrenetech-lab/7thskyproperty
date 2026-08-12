/**
 * waterTankIntake.routes.js — enquiries and the service-request wizard.
 * Mounted at /api/wt-intake (authenticated console).
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/waterTankIntake.controller');

router.use(authMiddleware);

// enquiries triage
router.get('/enquiries', ctrl.listEnquiries);
router.post('/enquiries', ctrl.createEnquiry);
router.patch('/enquiries/:id', ctrl.updateEnquiry);
router.delete('/enquiries/:id', ctrl.deleteEnquiry);

// new service request wizard
router.get('/request-reference', ctrl.requestReference);
router.post('/requests', ctrl.createRequest);

module.exports = router;
