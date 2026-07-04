const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tenancyLifecycle.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/', ctrl.listVacancyNotices);
router.post('/', ctrl.createVacancyNotice);
router.get('/:id', ctrl.getVacancyNotice);
router.patch('/:id', ctrl.updateVacancyNotice);
router.post('/:id/schedule-exit', ctrl.scheduleExit);

module.exports = router;
