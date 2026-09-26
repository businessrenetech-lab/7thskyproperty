const express = require('express');

const router = express.Router();
const ctrl = require('../controllers/ruralSourcing.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/summary', ctrl.summary);
router.get('/briefs', ctrl.listBriefs);
router.post('/briefs', ctrl.createBrief);
router.get('/search', ctrl.listSearch);
router.post('/search', ctrl.addSearch);
router.get('/shortlist', ctrl.listShortlist);
router.post('/shortlist', ctrl.addShortlist);

module.exports = router;
