const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/serviceCatalog.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const READ = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts', 'staff'];
const WRITE = ['super_admin', 'branch_admin', 'property_manager'];
router.use(authMiddleware);

router.get('/verticals', ctrl.verticals);
router.get('/tree', ctrl.tree);
router.get('/items', ctrl.listItems);

router.post('/categories', roleMiddleware(WRITE), ctrl.createCategory);
router.put('/categories/:id', roleMiddleware(WRITE), ctrl.updateCategory);
router.delete('/categories/:id', roleMiddleware(WRITE), ctrl.deleteCategory);

router.post('/items', roleMiddleware(WRITE), ctrl.createItem);
router.put('/items/:id', roleMiddleware(WRITE), ctrl.updateItem);
router.delete('/items/:id', roleMiddleware(WRITE), ctrl.deleteItem);

module.exports = router;
