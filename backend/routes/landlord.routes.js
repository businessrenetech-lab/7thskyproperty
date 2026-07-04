const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/landlord.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware, ctrl.requireLandlord);

router.get('/me', ctrl.me);
router.get('/portfolio', ctrl.portfolio);
router.get('/properties/:id', ctrl.propertyDetail);
router.get('/statements', ctrl.listStatements);
router.get('/statements/:id', ctrl.getStatement);
router.get('/statements/:id/pdf.html', ctrl.statementPrintable);
router.get('/approvals', ctrl.approvals);
router.post('/approvals/application/:id/decide', ctrl.decideApplication);
router.post('/approvals/work-order/:id/decide', ctrl.decideWorkOrder);
router.post('/approvals/renewal/:tenancyId/decide', ctrl.decideRenewal);
router.post('/approvals/settlement/:id/decide', ctrl.decideSettlement);
router.get('/documents', ctrl.documents);
// Two routes so we don't need the optional-param syntax (Express 5 rejects it):
router.get('/messages', ctrl.messages);
router.get('/messages/:property_id', ctrl.messages);
router.post('/messages', ctrl.sendMessage);
router.get('/onboarding/:property_id', ctrl.onboarding);

module.exports = router;
