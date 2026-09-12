/**
 * /api/wt-supplier-bills — accounts payable (supplier bills + payments).
 * Scoped by the X-Service-Line header. Guarded by the shared WT role tiers.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead, canOperate, canTransact, canAdminister } = require('../middleware/wtRoles');
const ctrl = require('../controllers/waterTankSupplierBill.controller');

router.use(authMiddleware);

router.get('/', canRead, ctrl.list);
router.post('/', canOperate, ctrl.create);
router.post('/:code/pay', canTransact, ctrl.pay);
router.post('/:code/void', canAdminister, ctrl.void);

module.exports = router;
