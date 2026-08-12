/**
 * /api/wt-amc — Annual Maintenance Contracts (SSPC-WTCM-SOP-01 §10).
 */
const express = require('express');

const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/waterTankAmc.controller');

router.use(authMiddleware);

// Static paths first so a contract is never looked up by the literal "reference".
router.get('/reference', ctrl.reference);
router.get('/overview', ctrl.overview);
router.post('/preview', ctrl.preview);

router.get('/', ctrl.list);
router.post('/', ctrl.create);

// Nested paths before /:code so they win the match.
router.get('/:code/visits', ctrl.listVisits);
router.patch('/:code/visits/:visitId', ctrl.updateVisit);
router.post('/:code/renew', ctrl.renew);

router.get('/:code', ctrl.detail);
router.patch('/:code', ctrl.update);
router.delete('/:code', ctrl.remove);

module.exports = router;
