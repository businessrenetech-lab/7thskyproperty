const express = require('express');
const router = express.Router();
const financeController = require('../controllers/finance.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');

router.use(authMiddleware);
router.use(roleMiddleware(['super_admin', 'branch_admin', 'accounts']));
router.use(branchMiddleware);

router.post('/expense', financeController.recordExpense);
router.get('/stats', financeController.getFinanceStats);
router.get('/overview', financeController.getOverview);
router.get('/report-suite', financeController.getReportSuite);
router.get('/profit-loss', financeController.getProfitLoss);
router.get('/trial-balance', financeController.getTrialBalance);
router.get('/cashflow', financeController.getCashFlow);
router.get('/income-expense', financeController.getIncomeExpense);
router.get('/student-income', financeController.getStudentIncome);

// Liquid Accounts (Bank, Cash, MFS)
router.get('/accounts/liquid', financeController.getLiquidAccounts);
router.post('/accounts/liquid', financeController.createLiquidAccount);

module.exports = router;
