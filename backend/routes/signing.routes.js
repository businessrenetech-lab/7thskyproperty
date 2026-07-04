const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/signing.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/templates', ctrl.listTemplates);
router.post('/templates', ctrl.createTemplate);

router.get('/envelopes', ctrl.listEnvelopes);
router.post('/envelopes', ctrl.createEnvelope);
router.get('/envelopes/:id', ctrl.getEnvelope);
router.post('/envelopes/:id/send', ctrl.sendEnvelope);
router.post('/envelopes/:id/void', ctrl.voidEnvelope);

module.exports = router;
