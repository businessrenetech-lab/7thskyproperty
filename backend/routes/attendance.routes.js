const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');

router.use(authMiddleware);
router.use(branchMiddleware);

// Students can view their own attendance
router.get('/student/me', attendanceController.getMyAttendance);

// Admin/trainer-only routes
router.post('/mark', roleMiddleware(['super_admin', 'branch_admin', 'trainer', 'staff']), attendanceController.markAttendance);
router.get('/batch', roleMiddleware(['super_admin', 'branch_admin', 'trainer', 'staff']), attendanceController.getBatchAttendance);
router.get('/student/:student_id', roleMiddleware(['super_admin', 'branch_admin', 'trainer', 'staff']), attendanceController.getStudentAttendance);

module.exports = router;
