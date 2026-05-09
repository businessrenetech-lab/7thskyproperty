const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payroll.controller');
const { branchMiddleware } = require('../middleware/branch.middleware');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);
router.use(roleMiddleware(['super_admin', 'branch_admin', 'hr', 'accounts']));
router.use(branchMiddleware);

router.get('/staff', payrollController.getStaff);
router.post('/profiles', payrollController.updateStaffProfile);
router.patch('/staff/:id/status', payrollController.updateStaffStatus);
router.get('/history', payrollController.getPayrollHistory);
router.get('/deductions', payrollController.getDeductions);
router.post('/deductions', payrollController.createDeduction);
router.patch('/deductions/:id', payrollController.updateDeduction);
router.delete('/deductions/:id', payrollController.deleteDeduction);
router.get('/bonuses', payrollController.getBonuses);
router.post('/bonuses', payrollController.createBonus);
router.patch('/bonuses/:id', payrollController.updateBonus);
router.delete('/bonuses/:id', payrollController.deleteBonus);
router.get('/teacher-sessions', payrollController.getTeacherSessions);
router.post('/teacher-sessions', payrollController.createTeacherSession);
router.patch('/teacher-sessions/:id', payrollController.updateTeacherSession);
router.delete('/teacher-sessions/:id', payrollController.deleteTeacherSession);
router.post('/generate', payrollController.generateDraftPayroll);
router.post('/pay/:id', payrollController.processPayment);
router.post('/reopen', payrollController.reopenPayroll);

module.exports = router;
