/**
 * /api/interior-variations — Variation Requests for Interior Design projects.
 * Scoped by the X-Service-Line header. Guarded by the shared WT role tiers.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead, canTransact } = require('../middleware/wtRoles');
const ctrl = require('../controllers/interiorVariation.controller');

router.use(authMiddleware);

router.get('/', canRead, ctrl.list);
router.post('/', canTransact, ctrl.create);
router.get('/:code', canRead, ctrl.detail);
router.patch('/:code', canTransact, ctrl.update);
router.post('/:code/decision', canTransact, ctrl.decision);

module.exports = router;
