const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rentalAssessment.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/property/:propertyId', ctrl.forProperty);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.post('/:id/items', ctrl.addItem);
router.put('/:id/items/:itemId', ctrl.updateItem);
router.delete('/:id/items/:itemId', ctrl.removeItem);
router.post('/:id/generate-work-orders', ctrl.generateWorkOrders);
router.post('/:id/complete', ctrl.complete);

module.exports = router;
