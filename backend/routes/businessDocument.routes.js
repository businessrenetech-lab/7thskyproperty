const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/businessDocument.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/seed-checklist', ctrl.seedChecklist);
router.put('/:id', ctrl.update);
router.patch('/:id/verify', ctrl.verify);
router.post('/:id/escalate', ctrl.escalate);
router.delete('/:id', ctrl.remove);

module.exports = router;
