/**
 * waterTankClients.routes.js — SSPC-WTCM-SOP-01 endpoints.
 * Fixed paths precede the /:id family so they aren't swallowed.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/waterTankClients.controller');

router.use(authMiddleware);

router.get('/reference', ctrl.reference);
router.get('/directory', ctrl.directory);
router.get('/lookup', ctrl.lookup);

router.get('/:id', ctrl.detail);
router.post('/:id/stage', ctrl.setStage);
router.post('/:id/consultation', ctrl.consultation);
router.post('/:id/agreement', ctrl.agreement);
router.post('/:id/deposit', ctrl.deposit);
router.post('/:id/handover', ctrl.handover);
router.post('/:id/closure', ctrl.closure);
router.post('/:id/note', ctrl.note);
router.post('/:id/register', ctrl.registerProject);

module.exports = router;
