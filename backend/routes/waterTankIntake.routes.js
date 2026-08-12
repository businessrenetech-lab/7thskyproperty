/**
 * waterTankIntake.routes.js — enquiries and the service-request wizard.
 * Mounted at /api/wt-intake (authenticated console).
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead, canOperate, canTransact, canBind, canAdminister } = require('../middleware/wtRoles');
const ctrl = require('../controllers/waterTankIntake.controller');

router.use(authMiddleware);

// enquiries triage
router.get('/enquiries', canRead, ctrl.listEnquiries);
router.post('/enquiries', canOperate, ctrl.createEnquiry);
router.patch('/enquiries/:id', canOperate, ctrl.updateEnquiry);
router.delete('/enquiries/:id', canAdminister, ctrl.deleteEnquiry);
// new service request wizard
router.get('/request-reference', canRead, ctrl.requestReference);
router.post('/requests', canOperate, ctrl.createRequest);

module.exports = router;
