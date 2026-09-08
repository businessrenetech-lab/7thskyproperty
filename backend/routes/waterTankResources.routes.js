/**
 * waterTankResources.routes.js — internal Team & Fleet (delivery-by-own-team lines
 * only; the controller refuses lines without team_fleet).
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead, canOperate, canBind } = require('../middleware/wtRoles');
const ctrl = require('../controllers/waterTankResources.controller');

router.use(authMiddleware);

router.get('/reference', canRead, ctrl.reference);
router.get('/availability', canRead, ctrl.availability);
router.get('/crew', canRead, ctrl.listCrew);
router.post('/crew', canOperate, ctrl.createCrew);
router.patch('/crew/:id', canOperate, ctrl.updateCrew);
router.delete('/crew/:id', canBind, ctrl.removeCrew);
router.get('/vehicles', canRead, ctrl.listVehicles);
router.post('/vehicles', canOperate, ctrl.createVehicle);
router.patch('/vehicles/:id', canOperate, ctrl.updateVehicle);
router.delete('/vehicles/:id', canBind, ctrl.removeVehicle);

module.exports = router;
