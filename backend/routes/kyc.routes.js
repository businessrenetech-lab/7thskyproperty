const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/kyc.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts'];
router.use(authMiddleware, roleMiddleware(ROLES));

router.get('/requirements/:role', ctrl.requirements);
router.get('/documents', ctrl.list);
router.get('/status', ctrl.status);
router.get('/review', ctrl.review);
router.post('/documents', ctrl.create);
router.patch('/documents/:id', ctrl.update);
router.patch('/documents/:id/verify', ctrl.verify);
router.delete('/documents/:id', ctrl.remove);

module.exports = router;
