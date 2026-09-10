const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/deal.controller');
const settle = require('../controllers/dealSettlement.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.get('/:id/settlement', settle.getSettlement);
router.post('/:id/settlement/prepare', settle.prepare);
router.post('/:id/settlement/approve', settle.approve);

module.exports = router;
