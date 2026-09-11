const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/salesCalendar.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware, roleMiddleware(['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts']));
router.get('/', ctrl.calendar);

module.exports = router;
