/**
 * waterTankIntake.routes.js — the service-request wizard (the single intake).
 * Mounted at /api/wt-intake (authenticated console). The separate enquiry
 * console has been retired; website leads arrive as Service Requests via the
 * public POST /public/water-tank/enquiry route.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead, canOperate } = require('../middleware/wtRoles');
const ctrl = require('../controllers/waterTankIntake.controller');

router.use(authMiddleware);

// new service request wizard
router.get('/request-reference', canRead, ctrl.requestReference);
router.post('/requests', canOperate, ctrl.createRequest);

module.exports = router;
