/**
 * /api/hr/exits: offboarding ported from Hadi Real Estate (plan Task 28). HR (off.manage) records exits and ticks
 * the checklist; payroll staff work out the final settlement; Accounts (pay.pay) marks it paid.
 */
const express = require('express');
const ctrl = require('../controllers/hrExit.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { hrRole } = require('../services/hrAccess.service');

const router = express.Router();
router.use(authMiddleware);
const read = hrRole('off.manage', 'pay.manage', 'pay.pay');
const manage = hrRole('off.manage');

router.get('/meta', read, ctrl.meta);
router.get('/', read, ctrl.list);
router.get('/:id', read, ctrl.get);
router.post('/', manage, ctrl.create);
router.post('/:id/checklist', manage, ctrl.tick);
router.post('/:id/cancel', manage, ctrl.cancel);
router.post('/:id/settlement', read, ctrl.settlement);
router.post('/:id/settlement/send', read, ctrl.sendSettlement);
router.post('/:id/settlement/paid', read, ctrl.settlementPaid);

module.exports = router;
