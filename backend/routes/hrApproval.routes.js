/**
 * /api/hr/approvals: HR change requests. Any HR role may see what they raised; deciding is checked per step
 * in the controller (canAct), so nobody approves their own request.
 */
const express = require('express');
const ctrl = require('../controllers/hrApproval.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { hrRole } = require('../services/hrAccess.service');

const router = express.Router();
router.use(authMiddleware);
router.use(hrRole('approvals.inbox', 'emp.view_own', 'org.edit'));
router.get('/', ctrl.list);
router.get('/badges', ctrl.badges);
router.get('/:id', ctrl.get);
router.post('/:id/decision', ctrl.decide);
router.post('/:id/withdraw', ctrl.withdraw);

module.exports = router;
