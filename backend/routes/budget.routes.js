const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budget.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');

router.use(authMiddleware);
router.use(roleMiddleware(['super_admin', 'branch_admin', 'accounts']));
router.use(branchMiddleware);

router.get('/', budgetController.getBudgets);
router.post('/', budgetController.createBudget);
router.get('/vs-actual', budgetController.getBudgetVsActual);

module.exports = router;
