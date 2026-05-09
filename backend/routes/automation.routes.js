const express = require('express');
const router = express.Router();
const automationController = require('../controllers/automation.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.use(authorize('super_admin'));

router.get('/', automationController.getRules);
router.post('/', automationController.createRule);
router.post('/run-birthday-check', automationController.runBirthdayCheck);
router.put('/:id', automationController.updateRule);
router.patch('/:id/toggle', automationController.toggleRule);
router.delete('/:id', automationController.deleteRule);

module.exports = router;
