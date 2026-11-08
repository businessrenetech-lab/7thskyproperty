/**
 * /api/hrm: attendance, office calendar, leave, shifts and schedules (ported from Hadi Real Estate).
 *
 *   /me/*   self-service for any signed-in staff member (client roles refused): check in / out, own
 *           attendance, apply for / cancel leave, own balance and application letter.
 *   others  the HR screens. GET needs the HR action time.view_all, every change time.manage (services/hrAccess:
 *           the CEO-editable HR access settings).
 */
const express = require('express');
const hrm = require('../controllers/hrm.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');
const roles = require('../utils/hrRoles');
const { hrRole } = require('../services/hrAccess.service');
const { onRosterOnly } = require('../services/hrRoster');

const router = express.Router();
router.use(authMiddleware, branchMiddleware);

const staffOnly = (req, res, next) => (roles.isStaff(req.user) ? next() : res.status(403).json({ error: 'Staff only' }));
const me = express.Router();
me.use(staffOnly, onRosterOnly);   // M2 §18: only people in the Employee Master
me.post('/attendance/check-in', hrm.checkIn);
me.post('/attendance/check-out', hrm.checkOut);
me.get('/attendance', hrm.getMyStaffAttendance);
me.get('/leave-types', hrm.myLeaveTypes);
me.get('/leaves', hrm.getMyLeaves);
me.post('/leaves', hrm.applyMyLeave);
me.get('/leave-balance', hrm.myLeaveBalance);
me.get('/leave-days', hrm.myLeaveDays);
me.post('/leaves/:id/cancel', hrm.cancelMyLeave);
me.get('/leaves/:id/print', hrm.printMyLeave);
me.get('/schedule', hrm.mySchedule);
router.use('/me', me);

const hrRead = hrRole('time.view_all');
const hrWrite = hrRole('time.manage');
router.use((req, res, next) => (req.method === 'GET' ? hrRead : hrWrite)(req, res, next));

router.get('/dashboard/stats', hrm.getDashboardStats);
router.get('/staff', hrm.getStaff);

router.post('/attendance/mark', hrm.markStaffAttendance);
router.get('/attendance', hrm.getStaffAttendance);
router.get('/attendance/summary', hrm.getStaffAttendanceSummary);
router.get('/attendance/summary/print', hrm.printStaffAttendanceSummary);
router.get('/attendance/calendar', hrm.getCalendar);
router.put('/attendance/calendar/weekly-off', hrm.setWeeklyOff);
router.post('/attendance/calendar/holidays', hrm.addHoliday);
router.delete('/attendance/calendar/holidays/:id', hrm.deleteHoliday);

router.get('/leave-types', hrm.getLeaveTypes);
router.post('/leave-types', hrm.createLeaveType);
router.patch('/leave-types/:id', hrm.updateLeaveType);
router.get('/leaves', hrm.getLeaveRequests);
router.post('/leaves', hrm.createLeaveRequest);
router.patch('/leaves/:id/approve', hrm.approveLeave);
router.patch('/leaves/:id/reject', hrm.rejectLeave);
router.get('/leaves/balance', hrm.getLeaveBalance);
router.get('/leaves/balances', hrm.getLeaveBalances);
router.get('/leaves/days', hrm.getLeaveDays);
router.get('/leaves/:id/print', hrm.printLeave);

router.get('/shifts', hrm.getShifts);
router.post('/shifts', hrm.createShift);
router.patch('/shifts/:id', hrm.updateShift);
router.get('/schedules', hrm.getSchedules);
router.post('/schedules', hrm.createSchedule);
router.delete('/schedules/:id', hrm.deleteSchedule);

module.exports = router;
