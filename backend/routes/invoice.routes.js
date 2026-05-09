const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');

router.use(authMiddleware);
router.use(roleMiddleware(['super_admin', 'branch_admin', 'accounts']));
router.use(branchMiddleware);

router.get('/', invoiceController.getInvoices);
router.get('/stats', invoiceController.getInvoiceStats);
router.get('/aging', invoiceController.getAgingAnalysis);
router.post('/', invoiceController.createInvoice);

// Income Category routes
router.get('/categories', invoiceController.getIncomeCategories);
router.get('/categories/flat', invoiceController.getAllIncomeCategoriesFlat);
router.post('/categories', invoiceController.createIncomeCategory);
router.put('/categories/:id', invoiceController.updateIncomeCategory);
router.delete('/categories/:id', invoiceController.deleteIncomeCategory);

// Customer routes
router.get('/customers', invoiceController.getCustomers);
router.post('/customers', invoiceController.createCustomer);
router.put('/customers/:id', invoiceController.updateCustomer);
router.delete('/customers/:id', invoiceController.deleteCustomer);

// Custom Invoice Payment
router.post('/:id/pay', invoiceController.payCustomInvoice);

router.put('/:id', invoiceController.updateInvoice);

module.exports = router;
