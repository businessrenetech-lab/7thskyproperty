const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollment.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');

router.use(authMiddleware);
router.use(roleMiddleware(['super_admin', 'branch_admin', 'counselor', 'staff']));
router.use(branchMiddleware);

router.post('/', enrollmentController.createEnrollment);
router.get('/', enrollmentController.getEnrollments);

module.exports = router;
