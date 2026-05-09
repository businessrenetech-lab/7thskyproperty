const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branch.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const uploadBranchImage = require('../utils/uploadBranchImage');

// ─── BRANCH CRUD (super_admin only for create/delete) ─────────
router.get('/', authMiddleware, roleMiddleware(['super_admin', 'branch_admin']), branchController.getAllBranches);
router.post('/', authMiddleware, roleMiddleware(['super_admin']), branchController.createBranch);
router.put('/:id', authMiddleware, roleMiddleware(['super_admin', 'branch_admin']), branchController.updateBranch);
router.post('/:id/upload-image', authMiddleware, roleMiddleware(['super_admin', 'branch_admin']), uploadBranchImage.single('image'), branchController.uploadBranchImage);
router.patch('/:id/status', authMiddleware, roleMiddleware(['super_admin']), branchController.toggleBranchStatus);
router.delete('/:id', authMiddleware, roleMiddleware(['super_admin']), branchController.deactivateBranch);

// ─── BRANCH DRILL-DOWN DATA ──────────────────────────────────
router.get('/:id/summary', authMiddleware, roleMiddleware(['super_admin', 'branch_admin']), branchController.getBranchSummary);
router.get('/:id/students', authMiddleware, roleMiddleware(['super_admin', 'branch_admin']), branchController.getBranchStudents);
router.get('/:id/staff', authMiddleware, roleMiddleware(['super_admin', 'branch_admin']), branchController.getBranchStaff);
router.get('/:id/courses', authMiddleware, roleMiddleware(['super_admin', 'branch_admin']), branchController.getBranchCourses);
router.get('/:id/contacts', authMiddleware, roleMiddleware(['super_admin', 'branch_admin']), branchController.getBranchContacts);
router.get('/:id/assets', authMiddleware, roleMiddleware(['super_admin', 'branch_admin']), branchController.getBranchAssets);
router.get('/:id/accounting', authMiddleware, roleMiddleware(['super_admin', 'branch_admin']), branchController.getBranchAccounting);

module.exports = router;
