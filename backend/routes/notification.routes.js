const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { protect, roleMiddleware } = require('../middleware/auth.middleware');
const { branchScope } = require('../middleware/branch.middleware');

router.use(protect);
router.use(branchScope);

router.get('/', notificationController.getNotifications);
router.put('/:id/read', notificationController.markAsRead);
router.post('/', roleMiddleware(['super_admin', 'branch_admin', 'staff']), notificationController.createNotification);

module.exports = router;
