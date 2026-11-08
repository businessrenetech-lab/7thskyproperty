/**
 * /api/hr/org: organisation structure (plan Task 5). Everyone with HR access sees the basic structure;
 * changes need org.edit; cost centres and salary grades need org.view_cost (checked in the controller).
 */
const express = require('express');
const ctrl = require('../controllers/hrOrg.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { hrRole } = require('../services/hrAccess.service');

const router = express.Router();
router.use(authMiddleware);
const read = hrRole('org.view_basic');
const write = hrRole('org.edit');

router.get('/tree', read, ctrl.tree);
router.get('/alerts', read, ctrl.alerts);
router.get('/branches', read, ctrl.branches);
router.get('/:level', read, ctrl.list);
router.post('/:level', write, ctrl.create);
router.get('/:level/:id', read, ctrl.get);
router.patch('/:level/:id', write, ctrl.update);
router.post('/:level/:id/deactivate', write, ctrl.deactivate);

module.exports = router;
