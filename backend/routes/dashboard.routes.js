const express = require('express');
const router = express.Router();
const adminDashboard = require('../controllers/adminDashboard.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');

router.use(authMiddleware);
router.use(branchMiddleware);

// The legacy /stats controller needs Language Academy models (Batch, Course,
// Student) this app does not ship, and used to take the whole router down
// with it. Load it only where those models exist.
try {
  const dashboardController = require('../controllers/dashboard.controller');
  router.get('/stats', dashboardController.getStats);
} catch (err) {
  if (err.code !== 'MODULE_NOT_FOUND') throw err;
}
// Company-wide money and pipeline: staff only, never the portal roles.
router.get('/overview', roleMiddleware(['super_admin', 'branch_admin', 'property_manager', 'accounts']), adminDashboard.overview);

module.exports = router;
