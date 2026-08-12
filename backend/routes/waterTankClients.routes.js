/**
 * waterTankClients.routes.js — SSPC-WTCM-SOP-01 endpoints.
 * Fixed paths precede the /:id family so they aren't swallowed.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead, canOperate, canTransact, canBind, canAdminister } = require('../middleware/wtRoles');
const ctrl = require('../controllers/waterTankClients.controller');

router.use(authMiddleware);

router.get('/reference', canRead, ctrl.reference);
router.get('/directory', canRead, ctrl.directory);
router.get('/lookup', canRead, ctrl.lookup);
router.get('/:id', canRead, ctrl.detail);
router.post('/:id/stage', canOperate, ctrl.setStage);
router.post('/:id/consultation', canOperate, ctrl.consultation);
router.post('/:id/agreement', canOperate, ctrl.agreement);
router.post('/:id/deposit', canTransact, ctrl.deposit);
router.post('/:id/handover', canOperate, ctrl.handover);
router.post('/:id/closure', canOperate, ctrl.closure);
router.post('/:id/note', canOperate, ctrl.note);
router.post('/:id/register', canOperate, ctrl.registerProject);

module.exports = router;
