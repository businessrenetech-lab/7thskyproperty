/**
 * /api/wt-amc — Annual Maintenance Contracts (SSPC-WTCM-SOP-01 §10).
 */
const express = require('express');

const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { canRead, canOperate, canTransact, canBind, canAdminister } = require('../middleware/wtRoles');
const ctrl = require('../controllers/waterTankAmc.controller');

router.use(authMiddleware);

// Static paths first so a contract is never looked up by the literal "reference".
router.get('/reference', canRead, ctrl.reference);
router.get('/overview', canRead, ctrl.overview);
router.post('/preview', canOperate, ctrl.preview);
router.get('/', canRead, ctrl.list);
router.post('/', canOperate, ctrl.create);
// Nested paths before /:code so they win the match.
router.get('/:code/visits', canRead, ctrl.listVisits);
router.patch('/:code/visits/:visitId', canOperate, ctrl.updateVisit);
router.post('/:code/renew', canBind, ctrl.renew);
router.get('/:code', canRead, ctrl.detail);
router.patch('/:code', canOperate, ctrl.update);
router.delete('/:code', canAdminister, ctrl.remove);

module.exports = router;
