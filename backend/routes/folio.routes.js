const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/folio.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware, roleMiddleware(['super_admin', 'branch_admin', 'accounts', 'property_manager']));
router.get('/settings', ctrl.settings);
router.put('/settings', ctrl.updateSettings);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);

module.exports = router;
