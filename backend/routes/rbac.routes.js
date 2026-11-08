const express = require('express');
const router = express.Router();
const rbacController = require('../controllers/rbac.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

// Any authenticated user can read (needed to build their sidebar)
router.get('/config', authMiddleware, rbacController.getConfig);

// Only super_admin / branch_admin can write
router.put('/config', authMiddleware, roleMiddleware(['super_admin', 'branch_admin']), rbacController.saveConfig);

// Users & roles: admins read the catalogue and roles; only a super admin creates, edits or deletes a role.
const ADMINS = roleMiddleware(['super_admin', 'branch_admin']);
const SUPER = roleMiddleware(['super_admin']);
router.get('/catalog', authMiddleware, ADMINS, rbacController.catalog);
router.get('/roles', authMiddleware, ADMINS, rbacController.listRoles);
router.post('/roles', authMiddleware, SUPER, rbacController.createRole);
router.put('/roles/:key', authMiddleware, SUPER, rbacController.updateRole);
router.delete('/roles/:key', authMiddleware, SUPER, rbacController.deleteRole);

module.exports = router;
