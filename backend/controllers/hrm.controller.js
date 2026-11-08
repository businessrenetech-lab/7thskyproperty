/**
 * HR: attendance, office calendar, leave, shifts and schedules, plus the staff self-service endpoints.
 * Ported from Hadi Real Estate (hrm.controller + portal.controller self-service, 2026-10). Changes from Hadi:
 * role groups come from utils/hrRoles (no custom-role layer), client roles are never staff (NON_STAFF), pay
 * fields are never sent from these endpoints, and recruitment / documents / reviews are left to the HRM plan
 * (docs/hrm/2026-10-30-hrm-plan.md).
 */
const { Op } = require('sequelize');
const User = require('../models/User');
const StaffProfile = require('../models/StaffProfile');
const StaffAttendance = require('../models/StaffAttendance');
const LeaveType = require('../models/LeaveType');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const Shift = require('../models/Shift');
const StaffSchedule = require('../models/StaffSchedule');
const Branch = require('../models/Branch');
const roles = require('../utils/hrRoles');
const { can } = require('../services/hrAccess.service');
const leaveSvc = require('../services/leave.service');
const calendar = require('../services/officeCalendar.service');
const attendanceReport = require('../services/attendanceReport.service');
const { rosterWhere } = require('../services/hrRoster');   // M2 §18

const PAY_FIELDS = ['base_salary', 'bank_name', 'account_no'];
const pick = (body, keys) => keys.reduce((o, k) => (body && body[k] !== undefined ? { ...o, [k]: body[k] } : o), {});

/* ═══════════════════════════════════════════════════════════════
   MODULE 1: STAFF ATTENDANCE
   ═══════════════════════════════════════════════════════════════ */

exports.markStaffAttendance = async (req, res) => {
  try {
    const { attendance_data, date } = req.body;
    // Extract IP address from request
    const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

    // attendance_data: [{ user_id, status, check_in, check_out, notes, latitude, longitude }]
    const records = await Promise.all(attendance_data.map(async (record) => {
      const staff = await User.findOne({ where: await rosterWhere({ id: record.user_id, branch_id: req.branchId }) });
      if (!staff) throw new Error(`Staff member ${record.user_id} not found in this branch`);

      const [att, created] = await StaffAttendance.findOrCreate({
        where: { user_id: record.user_id, date },
        defaults: {
          branch_id: req.branchId,
          status: record.status || 'present',
          check_in: record.check_in || null,
          check_out: record.check_out || null,
          method: record.method || 'manual',
          notes: record.notes || null,
          ip_address: ip_address || null,
          latitude: record.latitude || null,
          longitude: record.longitude || null,
        }
      });
      if (!created) {
        await att.update({
          status: record.status,
          check_in: record.check_in !== undefined ? record.check_in : att.check_in,
          check_out: record.check_out !== undefined ? record.check_out : att.check_out,
          notes: record.notes !== undefined ? record.notes : att.notes,
          ip_address: ip_address || att.ip_address,
          latitude: record.latitude !== undefined ? record.latitude : att.latitude,
          longitude: record.longitude !== undefined ? record.longitude : att.longitude,
        });
      }
      return att;
    }));
    res.json({ message: 'Staff attendance marked.', records });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getStaffAttendance = async (req, res) => {
  try {
    const { date, user_id } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Build query for staff
    const staffQuery = {
      branch_id: req.branchId,
      role: { [Op.notIn]: roles.NON_STAFF },
    };
    if (user_id) staffQuery.id = user_id;

    // Fetch all staff members in the branch
    const staffMembers = await User.findAll({
      where: await rosterWhere(staffQuery),
      attributes: ['id', 'name', 'email', 'role', 'status'],
      include: [
        { model: StaffProfile, required: false, attributes: { exclude: PAY_FIELDS } },
        { 
          model: StaffAttendance, 
          required: false, 
          where: { date: targetDate } 
        }
      ],
      order: [['name', 'ASC']],
    });
    
    // Removed staff (login deactivated) only for days up to their exit date, so old days can still be corrected.
    const staff = staffMembers.filter((u) => {
      if (u.status !== 'inactive') return true;
      const left = u.StaffProfile && u.StaffProfile.exit_date ? String(u.StaffProfile.exit_date).slice(0, 10) : null;
      return Boolean(left && left >= targetDate);
    });
    res.json({
      date: targetDate,
      staff,
      closed: await calendar.closedOn(targetDate, req.branchId || null),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Monthly summary: the office's whole roster for the month (former staff only for the months they worked),
 * every day of the month. services/attendanceReport.service.js.
 */
exports.getStaffAttendanceSummary = async (req, res) => {
  try {
    const report = await attendanceReport.monthReport({ branchId: req.branchId, month: req.query.month, year: req.query.year });
    res.json(report.rows);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

/**
 * Office calendar (owner request 2026-10-17): the weekly closed days (every office) and public holidays / other
 * closures (every office, or this one). Attendance is not counted on those days.
 */
exports.getCalendar = async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const holidays = await calendar.listHolidays({ from: `${year}-01-01`, to: `${year}-12-31`, branchId: req.branchId || null });
    res.json({ year, weekly_off: await calendar.getWeeklyOff(), day_names: calendar.DAY_NAMES, holidays });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

exports.setWeeklyOff = async (req, res) => {
  try {
    // The weekly closed day is for every office: company-level roles only.
    if (!roles.seesAllOffices(req.user)) return res.status(403).json({ error: 'The weekly closed day is set by a company-level admin' });
    res.json({ weekly_off: await calendar.setWeeklyOff((req.body || {}).days) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message, field: error.field });
  }
};

exports.addHoliday = async (req, res) => {
  try {
    const body = req.body || {};
    // Every office: company-level roles only; an office-bound admin closes their own office.
    const branchId = body.scope === 'office' || !roles.seesAllOffices(req.user) ? (req.branchId || null) : null;
    const h = await calendar.addHoliday({ ...body, branch_id: branchId, user: req.user });
    res.status(201).json(h);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message, field: error.field });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    const OfficeHoliday = require('../models/OfficeHoliday');
    const h = await OfficeHoliday.findByPk(req.params.id);
    // Office-bound admins remove their own office's days only; a company-wide day needs a company-level role.
    if (!h || (h.branch_id && req.branchId && h.branch_id !== req.branchId)) return res.status(404).json({ error: 'Not found' });
    if (!h.branch_id && !roles.seesAllOffices(req.user)) return res.status(403).json({ error: 'A day closed for every office can be removed by a company-level admin only' });
    await h.destroy();
    res.json({ ok: true });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

/** GET /attendance/summary/print?month&year[&print=1]: the branded A4 landscape page ("Export PDF"). */
exports.printStaffAttendanceSummary = async (req, res) => {
  try {
    const report = await attendanceReport.monthReport({ branchId: req.branchId, month: req.query.month, year: req.query.year });
    const branch = req.branchId ? await Branch.findByPk(req.branchId, { attributes: ['name'] }) : null;
    await attendanceReport.sendPrint(res, report, { office: branch ? branch.name : '', autoPrint: req.query.print === '1' });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

const getDhakaDate = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year').value;
  const month = parts.find((part) => part.type === 'month').value;
  const day = parts.find((part) => part.type === 'day').value;
  return `${year}-${month}-${day}`;
};

const getDhakaTime = () => new Date().toLocaleTimeString('en-GB', {
  hour12: false,
  timeZone: 'Asia/Dhaka',
});

/** Self-service check-in/out (any staff user). Also used by the staff portal. */
exports.selfCheckIn = async (req, res) => {
  try {
    const { latitude, longitude, action } = req.body;
    const today = getDhakaDate();
    const now = getDhakaTime();
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

    // Check if already checked in today
    const existing = await StaffAttendance.findOne({
      where: { user_id: req.user.id, date: today }
    });

    if (action === 'in' && existing?.check_in) {
      return res.status(400).json({ error: existing.check_out ? 'Already checked in and out for today.' : 'Already checked in today.' });
    }

    if (action === 'out') {
      if (!existing?.check_in) return res.status(400).json({ error: 'Check in first before checking out.' });
      if (existing.check_out) return res.status(400).json({ error: 'Already checked out for today.' });
      await existing.update({ check_out: now, ip_address: ip, branch_id: req.branchId });
      return res.json({ message: 'Checked out successfully!', type: 'checkout', record: existing });
    }

    if (existing && existing.check_in && !existing.check_out) {
      // Already checked in — this is a check-out
      await existing.update({ check_out: now, ip_address: ip, branch_id: req.branchId });
      return res.json({ message: 'Checked out successfully!', type: 'checkout', record: existing });
    }

    if (existing && existing.check_out) {
      return res.status(400).json({ error: 'Already checked in and out for today.' });
    }

    // New check-in
    const record = await StaffAttendance.create({
      user_id: req.user.id,
      branch_id: req.branchId,
      date: today,
      status: 'present',
      check_in: now,
      method: 'mobile',
      ip_address: ip,
      latitude: latitude || null,
      longitude: longitude || null,
    });

    res.json({ message: 'Checked in successfully!', type: 'checkin', record });
  } catch (error) {
    console.error('Self check-in error:', error);
    res.status(500).json({ error: 'Check-in failed. Please try again.' });
  }
};

exports.getMyStaffAttendance = async (req, res) => {
  try {
    const records = await StaffAttendance.findAll({
      where: { user_id: req.user.id },
      order: [['date', 'DESC']],
      limit: 60,
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   MODULE 2: LEAVE MANAGEMENT
   ═══════════════════════════════════════════════════════════════ */

// Leave rules, balances and the application letter: services/leave.service.js (owner request 2026-10-14).
const TYPE_FIELDS = ['name', 'days_per_year', 'is_paid', 'color', 'category', 'requires_proof', 'template', 'description', 'sort_order', 'is_active'];
const pickType = (body = {}) => {
  const out = {};
  TYPE_FIELDS.forEach((k) => { if (body[k] !== undefined) out[k] = body[k]; });
  if (out.name !== undefined) out.name = String(out.name).trim().slice(0, 80);
  if (out.days_per_year !== undefined) out.days_per_year = Math.max(0, Math.min(365, parseInt(out.days_per_year, 10) || 0));
  if (out.category !== undefined && !['annual', 'weekend', 'other'].includes(out.category)) out.category = 'other';
  if (out.template !== undefined) out.template = String(out.template || '').slice(0, 4000) || null;
  if (out.description !== undefined) out.description = String(out.description || '').slice(0, 255) || null;
  if (out.color !== undefined && !/^#[0-9a-f]{6}$/i.test(String(out.color))) delete out.color;
  return out;
};

exports.getLeaveTypes = async (req, res) => {
  try {
    await leaveSvc.ensureDefaultLeaveTypes();
    res.json(await leaveSvc.listTypes());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createLeaveType = async (req, res) => {
  try {
    const data = pickType(req.body);
    if (!data.name) return res.status(400).json({ error: 'Give the leave type a name', field: 'name' });
    const type = await LeaveType.create(data);
    res.status(201).json(type);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateLeaveType = async (req, res) => {
  try {
    const type = await LeaveType.findByPk(req.params.id);
    if (!type) return res.status(404).json({ error: 'Leave type not found' });
    const data = pickType(req.body);
    if (data.name !== undefined && !data.name) return res.status(400).json({ error: 'Give the leave type a name', field: 'name' });
    // The built-in weekend type keeps its rules (proof, no yearly cap).
    if (type.code === 'weekend') { delete data.category; delete data.requires_proof; }
    await type.update(data);
    res.json(type);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLeaveRequests = async (req, res) => {
  try {
    const { status, user_id } = req.query;
    const where = { branch_id: req.branchId };
    if (status) where.status = status;
    if (user_id) where.user_id = user_id;

    const requests = await LeaveRequest.findAll({
      where,
      include: leaveSvc.fullInclude(),
      order: [['created_at', 'DESC']],
    });
    res.json(await Promise.all(requests.map((r) => leaveSvc.present(r))));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/** HR files a request for themself, or (user_id) for a staff member of the office. Same rules as the portal. */
exports.createLeaveRequest = async (req, res) => {
  try {
    let userId = req.user.id;
    if (req.body && req.body.user_id && Number(req.body.user_id) !== req.user.id) {
      const staff = await User.findOne({ where: await rosterWhere({ id: Number(req.body.user_id), branch_id: req.branchId }), attributes: ['id'] });
      if (!staff) return res.status(404).json({ error: 'Staff member not found in this office', field: 'user_id' });
      userId = staff.id;
    }
    const v = await leaveSvc.validate(userId, req.body || {});
    if (v.error) return res.status(400).json({ error: v.error, field: v.field });
    const request = await LeaveRequest.create({ ...v.data, user_id: userId, branch_id: req.branchId });
    res.status(201).json(await leaveSvc.present(request));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.approveLeave = async (req, res) => {
  try {
    const request = await LeaveRequest.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(409).json({ error: 'This request is already ' + request.status });

    await request.update({
      status: 'approved',
      approved_by: req.user.id,
      approved_at: new Date(),
      rejection_note: String((req.body && req.body.note) || '').trim().slice(0, 1000) || null,
    });
    await leaveSvc.bumpLegacyBalance(request);
    const marked = await leaveSvc.markAttendance(request);

    res.json({ message: 'Leave approved.', request, attendance_marked: marked });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.rejectLeave = async (req, res) => {
  try {
    const request = await LeaveRequest.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(409).json({ error: 'This request is already ' + request.status });
    const note = String((req.body && (req.body.rejection_note || req.body.note)) || '').trim().slice(0, 1000);
    if (note.length < 3) return res.status(400).json({ error: 'Give the reason it is not approved', field: 'rejection_note' });

    await request.update({
      status: 'rejected',
      approved_by: req.user.id,
      approved_at: new Date(),
      rejection_note: note,
    });
    res.json({ message: 'Leave rejected.', request });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/** GET /leaves/days?from&to&user_id: working days of a leave for that staff member's office. */
exports.getLeaveDays = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(from || '')) || !/^\d{4}-\d{2}-\d{2}$/.test(String(to || '')) || to < from) return res.status(400).json({ error: 'from and to must be YYYY-MM-DD' });
    if (leaveSvc.countDays(from, to) > 366) return res.status(400).json({ error: 'At most a year' });
    let uid = req.user.id;
    if (req.query.user_id) {
      const u = await User.findOne({ where: { id: Number(req.query.user_id) || 0, branch_id: req.branchId }, attributes: ['id'] });
      if (!u) return res.status(404).json({ error: 'Staff member not found in this office' });
      uid = u.id;
    }
    res.json(await leaveSvc.leaveDays(uid, from, to));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/** GET /leaves/:id/print: the branded application letter ("PDF"). */
exports.printLeave = async (req, res) => {
  try {
    const request = await LeaveRequest.findOne({ where: { id: req.params.id, branch_id: req.branchId }, include: leaveSvc.fullInclude() });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    await leaveSvc.sendPrint(res, request, { autoPrint: req.query.print === '1' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/** GET /leaves/balances?year: every current staff member of the office with their balance per leave type. */
exports.getLeaveBalances = async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const staff = await User.findAll({
      where: await rosterWhere({ branch_id: req.branchId, status: { [Op.ne]: 'inactive' }, role: { [Op.notIn]: roles.NON_STAFF } }),
      attributes: ['id', 'name'],
      include: [{ model: StaffProfile, required: false, attributes: ['employee_id', 'designation'] }],
      order: [['name', 'ASC']],
    });
    const rows = [];
    for (const u of staff) {
      // eslint-disable-next-line no-await-in-loop
      const b = await leaveSvc.balances(u.id, year);
      const sp = u.StaffProfile || {};
      rows.push({ user: { id: u.id, name: u.name, employee_id: sp.employee_id || null, designation: sp.designation || null }, ...b });
    }
    res.json({ year, rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyLeaves = async (req, res) => {
  try {
    const requests = await LeaveRequest.findAll({
      where: { user_id: req.user.id },
      include: [{ model: LeaveType }, { model: User, as: 'Approver', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
    });
    res.json(await Promise.all(requests.map((r) => leaveSvc.present(r))));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLeaveBalance = async (req, res) => {
  try {
    const { user_id, year } = req.query;
    // Only HR/admin roles may look at someone else's balance; everyone else always gets their own.
    const canViewOthers = can(req.hrRole, 'time.view_all', req.hrSettings);
    const targetId = canViewOthers && user_id ? user_id : req.user.id;
    const balances = await LeaveBalance.findAll({
      where: { user_id: targetId, year: year || new Date().getFullYear() },
      include: [
        { model: LeaveType },
        { model: User, attributes: [], where: { branch_id: req.branchId } },
      ],
    });
    res.json(balances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   MODULE 3: SHIFT & SCHEDULE
   ═══════════════════════════════════════════════════════════════ */

exports.getShifts = async (req, res) => {
  try {
    const shifts = await Shift.findAll({ where: { branch_id: req.branchId } });
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createShift = async (req, res) => {
  try {
    const shift = await Shift.create({ ...pick(req.body, ['name', 'start_time', 'end_time', 'color']), branch_id: req.branchId });
    res.status(201).json(shift);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateShift = async (req, res) => {
  try {
    const shift = await Shift.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!shift) return res.status(404).json({ error: 'Shift not found' });

    await shift.update(pick(req.body, ['name', 'start_time', 'end_time', 'color']));
    res.json(shift);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSchedules = async (req, res) => {
  try {
    const { start_date, end_date, user_id } = req.query;
    const where = {};
    if (user_id) where.user_id = user_id;
    if (start_date && end_date) {
      where.date = { [Op.between]: [start_date, end_date] };
    }
    const schedules = await StaffSchedule.findAll({
      where,
      include: [
        { model: User, attributes: ['id', 'name', 'role'], where: { branch_id: req.branchId } },
        { model: Shift },
      ],
      order: [['date', 'ASC']],
    });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createSchedule = async (req, res) => {
  try {
    const staff = await User.findOne({ where: await rosterWhere({ id: req.body.user_id, branch_id: req.branchId }) });
    if (!staff) return res.status(404).json({ error: 'Staff member not found' });

    const shift = await Shift.findOne({ where: { id: req.body.shift_id, branch_id: req.branchId } });
    if (!shift) return res.status(404).json({ error: 'Shift not found' });

    const schedule = await StaffSchedule.create({
      user_id: req.body.user_id,
      shift_id: req.body.shift_id,
      date: req.body.date,
      notes: req.body.notes,
    });
    res.status(201).json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const schedule = await StaffSchedule.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['id'], where: { branch_id: req.branchId }, required: true }],
    });
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

    await schedule.destroy();
    res.json({ message: 'Schedule removed.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/** GET /staff: the office's current staff (never clients) for the HR pickers: shifts, leave, biometric PINs. */
exports.getStaff = async (req, res) => {
  try {
    const staff = await User.findAll({
      where: await rosterWhere({ role: { [Op.notIn]: roles.NON_STAFF }, status: { [Op.ne]: 'inactive' }, ...(req.branchId ? { branch_id: req.branchId } : {}) }),
      attributes: ['id', 'name', 'email', 'role', 'branch_id'],
      include: [{ model: StaffProfile, required: false, attributes: ['employee_id', 'designation', 'department'] }],
      order: [['name', 'ASC']],
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   HR DASHBOARD
   ═══════════════════════════════════════════════════════════════ */

exports.getDashboardStats = async (req, res) => {
  try {
    const today = getDhakaDate();
    const branchId = req.branchId;
    const staffWhere = await rosterWhere({ role: { [Op.notIn]: roles.NON_STAFF }, status: { [Op.ne]: 'inactive' }, ...(branchId ? { branch_id: branchId } : {}) });
    const scope = branchId ? { branch_id: branchId } : {};
    const [totalStaff, presentToday, lateToday, onLeaveToday, pendingLeaves, closed] = await Promise.all([
      User.count({ where: staffWhere }),
      StaffAttendance.count({ where: { ...scope, date: today, status: { [Op.in]: ['present', 'late', 'half_day'] } } }),
      StaffAttendance.count({ where: { ...scope, date: today, status: 'late' } }),
      StaffAttendance.count({ where: { ...scope, date: today, status: 'on_leave' } }),
      LeaveRequest.count({ where: { ...scope, status: 'pending' } }),
      calendar.closedOn(today, branchId || null),
    ]);
    res.json({
      date: today,
      closed,
      totalStaff,
      presentToday,
      lateToday,
      onLeaveToday,
      notMarkedToday: closed ? 0 : Math.max(0, totalStaff - presentToday - onLeaveToday),
      pendingLeaves,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   SELF-SERVICE (any signed-in staff member; always their own records)
   ═══════════════════════════════════════════════════════════════ */

exports.checkIn = (req, res) => { req.body = { ...(req.body || {}), action: 'in' }; return exports.selfCheckIn(req, res); };
exports.checkOut = (req, res) => { req.body = { ...(req.body || {}), action: 'out' }; return exports.selfCheckIn(req, res); };

exports.myLeaveTypes = async (req, res) => {
  try {
    await leaveSvc.ensureDefaultLeaveTypes();
    res.json((await leaveSvc.listTypes({ activeOnly: true })).map((t) => ({
      id: t.id, code: t.code, name: t.name, days_per_year: t.days_per_year, is_paid: t.is_paid, color: t.color,
      category: t.category, requires_proof: t.requires_proof, template: t.template, description: t.description,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/** Same rules as HR (services/leave.service.js): balance, overlap, weekend-leave proof. Days are counted on the server. */
exports.applyMyLeave = async (req, res) => {
  try {
    const v = await leaveSvc.validate(req.user.id, req.body || {});
    if (v.error) return res.status(400).json({ error: v.error, field: v.field });
    const request = await LeaveRequest.create({ ...v.data, user_id: req.user.id, branch_id: req.user.branch_id });
    res.status(201).json(await leaveSvc.present(request));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/** The own balance per leave type (Sick 11 + Casual 10 = 21 a year; weekend leave earned). */
exports.myLeaveBalance = async (req, res) => {
  try {
    await leaveSvc.ensureDefaultLeaveTypes();
    res.json(await leaveSvc.balances(req.user.id, parseInt(req.query.year, 10) || undefined));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/** Working days in the range (office closed days skipped), for the apply form. */
exports.myLeaveDays = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(from || '')) || !/^\d{4}-\d{2}-\d{2}$/.test(String(to || '')) || to < from) return res.status(400).json({ error: 'from and to must be YYYY-MM-DD' });
    if (leaveSvc.countDays(from, to) > 366) return res.status(400).json({ error: 'At most a year' });
    res.json(await leaveSvc.leaveDays(req.user.id, from, to));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/** The own request, while it is pending. */
exports.cancelMyLeave = async (req, res) => {
  try {
    const request = await LeaveRequest.findOne({ where: { id: Number(req.params.id) || 0, user_id: req.user.id } });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(409).json({ error: 'Only a pending request can be cancelled' });
    await request.update({ status: 'cancelled' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/** The own application letter ("PDF"). */
/** GET /me/schedule: the own roster for the next 4 weeks (plan Task 14, "My roster"). */
exports.mySchedule = async (req, res) => {
  try {
    const from = getDhakaDate();
    const to = new Date(`${from}T00:00:00Z`);
    to.setUTCDate(to.getUTCDate() + 27);
    const rows = await StaffSchedule.findAll({
      where: { user_id: req.user.id, date: { [Op.between]: [from, to.toISOString().slice(0, 10)] } },
      include: [{ model: Shift, attributes: ['id', 'name', 'start_time', 'end_time', 'color'] }],
      order: [['date', 'ASC']],
    });
    res.json({ from, to: to.toISOString().slice(0, 10), data: rows.map((r) => ({ id: r.id, date: r.date, notes: r.notes, shift: r.Shift || null })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.printMyLeave = async (req, res) => {
  try {
    const request = await LeaveRequest.findOne({ where: { id: Number(req.params.id) || 0, user_id: req.user.id }, include: leaveSvc.fullInclude() });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    await leaveSvc.sendPrint(res, request, { autoPrint: req.query.print === '1' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
