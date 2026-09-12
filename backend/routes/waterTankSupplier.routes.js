/**
 * /api/wt-suppliers — supplier / vendor register for project costing + A/P.
 * Scoped by the X-Service-Line header. Guarded by the shared WT role tiers.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead, canOperate } = require('../middleware/wtRoles');
const ctrl = require('../controllers/waterTankSupplier.controller');

router.use(authMiddleware);

router.get('/', canRead, ctrl.list);
router.post('/', canOperate, ctrl.create);
router.get('/:code', canRead, ctrl.detail);
router.patch('/:code', canOperate, ctrl.update);

module.exports = router;
