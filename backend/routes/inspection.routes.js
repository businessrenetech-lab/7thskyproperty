const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inspection.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware, roleMiddleware(['super_admin', 'branch_admin', 'property_manager']));
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.post('/:id/items', ctrl.addItem);

module.exports = router;
