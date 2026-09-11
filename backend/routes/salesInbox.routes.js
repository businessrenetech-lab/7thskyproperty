const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/salesInbox.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/', ctrl.inbox);
router.get('/thread', ctrl.thread);
router.post('/reply', ctrl.reply);
router.post('/compose', ctrl.compose);
router.delete('/participants/:id', ctrl.removeParticipant);
router.get('/:threadKey/participants', ctrl.participants);
router.post('/:threadKey/participants', ctrl.addParticipant);
router.post('/:threadKey/assign', ctrl.assign);

module.exports = router;
