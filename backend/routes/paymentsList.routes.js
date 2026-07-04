const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invoicing.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware, roleMiddleware(['super_admin', 'branch_admin', 'accounts', 'property_manager']));
router.get('/', ctrl.listPayments);

module.exports = router;
