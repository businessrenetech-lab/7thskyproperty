const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');

const upload = require('../utils/upload');

router.use(authMiddleware);
router.use(roleMiddleware(['super_admin', 'branch_admin', 'accounts']));
router.use(branchMiddleware);

router.get('/', expenseController.getExpenses);
router.get('/split', expenseController.getExpenseSplit);

// Handle multipart/form-data for receipt uploads
router.post('/', upload.single('receipt'), expenseController.createExpense);
router.put('/:id', upload.single('receipt'), expenseController.updateExpense);

// Verification & Approval Layers
router.put('/:id/payment-source', expenseController.selectPaymentSource);
router.put('/:id/verify', expenseController.verifyExpense);
router.put('/:id/approve', expenseController.approveExpense);
router.put('/:id/reject', expenseController.rejectExpense);

// Delete expense (soft-delete with reason + journal reversal)
router.delete('/:id', expenseController.deleteExpense);

// Expense Category routes
router.get('/categories', expenseController.getExpenseCategories);
router.get('/categories/flat', expenseController.getAllCategoriesFlat);
router.post('/categories', expenseController.createExpenseCategory);
router.put('/categories/:id', expenseController.updateExpenseCategory);
router.delete('/categories/:id', expenseController.deleteExpenseCategory);

module.exports = router;
