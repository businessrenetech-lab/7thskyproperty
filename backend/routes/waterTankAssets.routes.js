/**
 * waterTankAssets.routes.js — Property Asset & Maintenance register (asset_register
 * lines only; the controller refuses lines without it).
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead, canOperate, canBind } = require('../middleware/wtRoles');
const ctrl = require('../controllers/waterTankAssets.controller');

router.use(authMiddleware);

router.get('/reference', canRead, ctrl.reference);
router.get('/summary', canRead, ctrl.summary);
router.get('/', canRead, ctrl.list);
router.post('/', canOperate, ctrl.create);
router.patch('/:id', canOperate, ctrl.update);
router.delete('/:id', canBind, ctrl.remove);

module.exports = router;
