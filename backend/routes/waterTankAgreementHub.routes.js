/**
 * /api/wt-agreement-hub — one register for every Water Tank agreement
 * (client, provider and work order), read from the signing engine itself.
 */
const express = require('express');

const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead, canOperate, canTransact, canBind, canAdminister } = require('../middleware/wtRoles');
const ctrl = require('../controllers/waterTankAgreementHub.controller');

router.use(authMiddleware);

router.get('/overview', canRead, ctrl.overview);
router.get('/', canRead, ctrl.list);
router.get('/:id/signed', canRead, ctrl.signedDocument);
// Issuing a signing link is a deliberate, audited act — never a side effect of
// listing agreements.
router.post('/:id/signing-link/:signerId', canBind, ctrl.signingLink);
router.post('/:id/resend', canBind, ctrl.resend);
router.post('/:id/void', canBind, ctrl.void);
router.get('/:id', canRead, ctrl.detail);

module.exports = router;
