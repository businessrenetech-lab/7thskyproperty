/**
 * /api/hr/reports/org/:kind (M1 §8, ?format=csv) and /api/hr/dashboard (M1 §12). Mounted at /api/hr, so
 * auth is attached per route rather than with router.use.
 */
const express = require('express');
const ctrl = require('../controllers/hrReports.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { hrRole } = require('../services/hrAccess.service');

const router = express.Router();
const hr = hrRole('org.edit', 'emp.view_any', 'approvals.inbox');
router.get('/reports/org/:kind', authMiddleware, hr, ctrl.orgReport);
router.get('/reports/employees/:kind', authMiddleware, hr, ctrl.employeeReport);
router.get('/reports/recruitment/:kind', authMiddleware, hrRole('rec.manage'), ctrl.recruitmentReport);
router.get('/dashboard', authMiddleware, hr, ctrl.dashboard);

module.exports = router;
