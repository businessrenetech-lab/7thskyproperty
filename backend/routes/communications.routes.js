const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/communications.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/inbox', ctrl.inbox);
router.get('/thread', ctrl.thread);
router.post('/reply', ctrl.reply);
router.post('/read', ctrl.markRead);
router.post('/', ctrl.compose);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
