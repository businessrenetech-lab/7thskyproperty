/**
 * /api/hr/payroll: payroll ported from Hadi Real Estate (plan Task 27). HR (pay.manage) prepares months and
 * adjustments, Finance (pay.view) reads them, Accounts (pay.pay) pays an approved month, the CEO reopens one.
 */
const express = require('express');
const ctrl = require('../controllers/hrPayroll.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { hrRole } = require('../services/hrAccess.service');

const router = express.Router();
router.use(authMiddleware);
const read = hrRole('pay.view', 'pay.manage', 'pay.pay');
const manage = hrRole('pay.manage');

router.get('/mine', ctrl.mine);
router.get('/payslips/:id', ctrl.getPayslip);
router.get('/meta', read, ctrl.meta);
router.get('/runs', read, ctrl.listRuns);
router.post('/runs', manage, ctrl.prepare);
router.get('/runs/:id', read, ctrl.getRun);
router.post('/runs/:id/submit', manage, ctrl.submit);
router.post('/runs/:id/pay', hrRole('pay.pay'), ctrl.pay);
router.post('/runs/:id/reopen', read, ctrl.reopen);
router.get('/adjustments', read, ctrl.listAdjustments);
router.post('/adjustments', manage, ctrl.createAdjustment);
router.post('/adjustments/:id/decision', manage, ctrl.decideAdjustment);
router.delete('/adjustments/:id', manage, ctrl.deleteAdjustment);

module.exports = router;
