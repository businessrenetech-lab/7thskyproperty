/**
 * /api/line-dashboards — the per-line console dashboards. Read-only.
 *
 * /jobs reads the shared wt_* engine, so it takes the same read tier as the
 * Water Tank screens (wtRoles.canRead) and the X-Service-Line header picks
 * which line, and which of the field / projects / cases layouts, it returns.
 */
const express = require('express');

const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const { canRead } = require('../middleware/wtRoles');
const ctrl = require('../controllers/lineDashboards.controller');

const READ = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts'];

router.use(authMiddleware);
router.get('/jobs', canRead, ctrl.jobs);
router.get('/rentals', roleMiddleware(READ), ctrl.rentals);
router.get('/sales', roleMiddleware(READ), ctrl.sales);
router.get('/short-stay', roleMiddleware(READ), ctrl.shortStay);

module.exports = router;
