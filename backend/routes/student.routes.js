const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');

router.use(authMiddleware);
router.use(branchMiddleware);

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `student_${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage });

router.get('/', studentController.getAllStudents);
router.get('/:id', studentController.getStudentById);
router.put('/:id', studentController.updateStudent);
router.put('/:id/photo', upload.single('photo'), studentController.uploadPhoto);
router.patch('/:id/management', studentController.updateStudentManagement);
router.patch('/:id/success-record', studentController.updateStudentSuccessRecord);
router.get('/:id/activities', studentController.getStudentActivities);
router.post('/:id/activities', studentController.createStudentActivity);
router.post('/:id/request-partner-access', studentController.requestPartnerAccess);
router.put('/me', studentController.updateMe);
router.post('/', studentController.createStudent);
router.post('/enroll', studentController.enrollInBatch);

module.exports = router;
