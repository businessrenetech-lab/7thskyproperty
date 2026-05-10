const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');

const READ_ROLES = ['super_admin', 'branch_admin', 'counselor', 'trainer', 'staff', 'accounts'];
const WRITE_ROLES = ['super_admin', 'branch_admin', 'counselor', 'trainer', 'staff'];

router.use(authMiddleware);
router.put('/me', studentController.updateMe);
router.use(branchMiddleware);

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `student_${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage });

router.get('/', roleMiddleware(READ_ROLES), studentController.getAllStudents);
router.get('/:id', roleMiddleware(READ_ROLES), studentController.getStudentById);
router.get('/:id/activities', roleMiddleware(READ_ROLES), studentController.getStudentActivities);

router.put('/:id', roleMiddleware(WRITE_ROLES), studentController.updateStudent);
router.put('/:id/photo', roleMiddleware(WRITE_ROLES), upload.single('photo'), studentController.uploadPhoto);
router.patch('/:id/management', roleMiddleware(WRITE_ROLES), studentController.updateStudentManagement);
router.patch('/:id/success-record', roleMiddleware(WRITE_ROLES), studentController.updateStudentSuccessRecord);
router.post('/:id/activities', roleMiddleware(WRITE_ROLES), studentController.createStudentActivity);
router.post('/:id/request-partner-access', roleMiddleware(WRITE_ROLES), studentController.requestPartnerAccess);
router.post('/', roleMiddleware(WRITE_ROLES), studentController.createStudent);
router.post('/enroll', roleMiddleware(WRITE_ROLES), studentController.enrollInBatch);

module.exports = router;
