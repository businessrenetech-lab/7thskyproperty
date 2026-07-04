const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/accountCategory.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware, roleMiddleware(['super_admin', 'branch_admin', 'accounts', 'property_manager']));
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
