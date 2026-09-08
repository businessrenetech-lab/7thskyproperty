/**
 * waterTankConcierge.routes.js — Concierge & Access: access declarations + property
 * entry/exit visits (concierge lines only; the controller refuses lines without it).
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead, canOperate, canBind } = require('../middleware/wtRoles');
const ctrl = require('../controllers/waterTankConcierge.controller');

router.use(authMiddleware);

router.get('/reference', canRead, ctrl.reference);
router.get('/summary', canRead, ctrl.summary);

router.get('/declarations', canRead, ctrl.listDeclarations);
router.post('/declarations', canOperate, ctrl.createDeclaration);
router.patch('/declarations/:id', canOperate, ctrl.updateDeclaration);
router.delete('/declarations/:id', canBind, ctrl.removeDeclaration);

router.get('/visits', canRead, ctrl.listVisits);
router.post('/visits', canOperate, ctrl.createVisit);
router.patch('/visits/:id', canOperate, ctrl.updateVisit);
router.delete('/visits/:id', canBind, ctrl.removeVisit);

module.exports = router;
