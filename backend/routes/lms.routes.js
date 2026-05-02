const express = require('express');
const router = express.Router();
const lmsController = require('../controllers/lms.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');

router.use(authMiddleware);
router.use(branchMiddleware);

router.get('/batches', lmsController.getAllBatches);
router.post('/batches', lmsController.createBatch);
router.put('/batches/:id', lmsController.updateBatch);
router.get('/batches/:id', lmsController.getBatchById);
router.get('/batches/:id/students', lmsController.getBatchStudents);
router.post('/batches/:id/notify', lmsController.notifyBatchStudents);
router.get('/courses', lmsController.getCourses);
router.post('/courses', lmsController.createCourse);
router.put('/courses/:id', lmsController.updateCourse);

const uploadCourseImage = require('../utils/uploadCourseImage');
router.post('/courses/upload-image', uploadCourseImage.single('image'), lmsController.uploadCourseImageHandler);

router.patch('/batches/:id/status', lmsController.updateBatchStatus);

module.exports = router;
