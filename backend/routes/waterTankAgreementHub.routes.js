/**
 * /api/wt-agreement-hub — one register for every Water Tank agreement
 * (client, provider and work order), read from the signing engine itself.
 */
const express = require('express');

const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/waterTankAgreementHub.controller');

router.use(authMiddleware);

router.get('/overview', ctrl.overview);
router.get('/', ctrl.list);

router.get('/:id/signed', ctrl.signedDocument);
router.post('/:id/resend', ctrl.resend);
router.post('/:id/void', ctrl.void);
router.get('/:id', ctrl.detail);

module.exports = router;
