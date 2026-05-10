const express = require('express');
const router = express.Router();
const lmsController = require('../controllers/lms.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');

const READ_ROLES = ['super_admin', 'branch_admin', 'trainer', 'staff', 'accounts'];
const WRITE_ROLES = ['super_admin', 'branch_admin', 'trainer', 'staff'];

router.use(authMiddleware);
router.use(branchMiddleware);

router.get('/batches', roleMiddleware(READ_ROLES), lmsController.getAllBatches);
router.get('/batches/:id', roleMiddleware(READ_ROLES), lmsController.getBatchById);
router.get('/batches/:id/students', roleMiddleware(READ_ROLES), lmsController.getBatchStudents);
router.get('/courses', roleMiddleware(READ_ROLES), lmsController.getCourses);

router.post('/batches', roleMiddleware(WRITE_ROLES), lmsController.createBatch);
router.put('/batches/:id', roleMiddleware(WRITE_ROLES), lmsController.updateBatch);
router.post('/batches/:id/notify', roleMiddleware(WRITE_ROLES), lmsController.notifyBatchStudents);
router.post('/courses', roleMiddleware(WRITE_ROLES), lmsController.createCourse);
router.put('/courses/:id', roleMiddleware(WRITE_ROLES), lmsController.updateCourse);

const uploadCourseImage = require('../utils/uploadCourseImage');
router.post('/courses/upload-image', roleMiddleware(WRITE_ROLES), uploadCourseImage.single('image'), lmsController.uploadCourseImageHandler);

router.patch('/batches/:id/status', roleMiddleware(WRITE_ROLES), lmsController.updateBatchStatus);

module.exports = router;
