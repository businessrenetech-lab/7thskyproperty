/**
 * /api/hr/access: the HR "Roles & access" settings. CEO and HR Manager may read them; only access.manage
 * (the CEO by default) may change or reset them.
 */
const express = require('express');
const ctrl = require('../controllers/hrAccess.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { hrRole } = require('../services/hrAccess.service');

const router = express.Router();
router.use(authMiddleware);
router.get('/me', ctrl.me);
router.get('/', hrRole('access.manage', 'approvals.inbox'), ctrl.get);
router.put('/', hrRole('access.manage'), ctrl.update);
router.post('/reset', hrRole('access.manage'), ctrl.reset);

module.exports = router;
