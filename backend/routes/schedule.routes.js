const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/schedule.controller');
const { protect } = require('../middleware/auth.middleware');
const { branchScope } = require('../middleware/branch.middleware');

router.use(protect);
router.use(branchScope);

router.get('/', scheduleController.getSchedule);

module.exports = router;
