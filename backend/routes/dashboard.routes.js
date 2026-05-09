const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');

router.use(authMiddleware);
router.use(branchMiddleware);

router.get('/stats', dashboardController.getStats);

module.exports = router;
