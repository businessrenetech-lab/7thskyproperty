const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/lead.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.patch('/:id/status', ctrl.setStatus);
router.post('/:id/activities', ctrl.addActivity);
router.post('/:id/convert', ctrl.convert);

module.exports = router;
