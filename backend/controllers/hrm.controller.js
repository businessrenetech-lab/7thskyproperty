const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const User = require('../models/User');
const StaffProfile = require('../models/StaffProfile');
const StaffAttendance = require('../models/StaffAttendance');
const LeaveType = require('../models/LeaveType');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const JobPosting = require('../models/JobPosting');
const Applicant = require('../models/Applicant');
const StaffDocument = require('../models/StaffDocument');
const PerformanceReview = require('../models/PerformanceReview');
const Shift = require('../models/Shift');
const StaffSchedule = require('../models/StaffSchedule');

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
      role: { [Op.notIn]: ['student', 'guardian'] },
    };
    if (user_id) staffQuery.id = user_id;

    // Fetch all staff members in the branch
    const staffMembers = await User.findAll({
      where: staffQuery,
      attributes: ['id', 'name', 'email', 'role'],
      include: [
        { model: StaffProfile },
        { 
          model: StaffAttendance, 
          required: false, 
          where: { date: targetDate } 
        }
      ],
      order: [['name', 'ASC']],
    });
    
    // Debug log to trace what happens
    require('fs').writeFileSync('fallback.txt', `Date: ${targetDate}\nuser_id query: ${user_id}\nBranchID: ${req.branchId}\nStaffQuery: ${JSON.stringify(staffQuery)}\nResults: ${staffMembers.length}`);

    res.json({
      date: targetDate,
      staff: staffMembers
    });
  } catch (error) {
    require('fs').appendFileSync('error_dump.log', error.stack + '\n');
    res.status(500).json({ error: error.message });
  }
};

exports.getStaffAttendanceSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const records = await StaffAttendance.findAll({
      where: {
        branch_id: req.branchId,
        date: { [Op.between]: [startDate, endDate] },
      },
      include: [{ model: User, attributes: ['id', 'name', 'role'] }],
      order: [['date', 'ASC']]
    });

    // Group by user
    const summary = {};
    records.forEach(r => {
      if (!summary[r.user_id]) {
        summary[r.user_id] = { user: r.User, present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0, total: 0, entries: {} };
      }
      summary[r.user_id][r.status]++;
      summary[r.user_id].total++;
      
      const day = parseInt(r.date.split('-')[2]);
      summary[r.user_id].entries[day] = {
        status: r.status,
        check_in: r.check_in,
        check_out: r.check_out,
        notes: r.notes
      };
    });

    res.json(Object.values(summary));
  } catch (error) {
    res.status(500).json({ error: error.message });
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

exports.getLeaveTypes = async (req, res) => {
  try {
    const types = await LeaveType.findAll();
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createLeaveType = async (req, res) => {
  try {
    const type = await LeaveType.create(req.body);
    res.status(201).json(type);
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
      include: [
        { model: User, as: 'Employee', attributes: ['id', 'name', 'email', 'role'] },
        { model: User, as: 'Approver', attributes: ['id', 'name'] },
        { model: LeaveType },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createLeaveRequest = async (req, res) => {
  try {
    const { leave_type_id, start_date, end_date, total_days, reason } = req.body;
    const request = await LeaveRequest.create({
      user_id: req.user.id,
      branch_id: req.branchId,
      leave_type_id,
      start_date,
      end_date,
      total_days,
      reason,
    });
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.approveLeave = async (req, res) => {
  try {
    const request = await LeaveRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    await request.update({
      status: 'approved',
      approved_by: req.user.id,
      approved_at: new Date(),
    });

    // Update balance
    const [balance] = await LeaveBalance.findOrCreate({
      where: { user_id: request.user_id, leave_type_id: request.leave_type_id, year: new Date().getFullYear() },
      defaults: { entitled: 0, used: 0, carried_over: 0 },
    });
    await balance.update({ used: parseFloat(balance.used) + parseFloat(request.total_days) });

    res.json({ message: 'Leave approved.', request });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.rejectLeave = async (req, res) => {
  try {
    const request = await LeaveRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    await request.update({
      status: 'rejected',
      approved_by: req.user.id,
      rejection_note: req.body.rejection_note || '',
    });
    res.json({ message: 'Leave rejected.', request });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyLeaves = async (req, res) => {
  try {
    const requests = await LeaveRequest.findAll({
      where: { user_id: req.user.id },
      include: [{ model: LeaveType }],
      order: [['created_at', 'DESC']],
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLeaveBalance = async (req, res) => {
  try {
    const { user_id, year } = req.query;
    const balances = await LeaveBalance.findAll({
      where: { user_id: user_id || req.user.id, year: year || new Date().getFullYear() },
      include: [{ model: LeaveType }],
    });
    res.json(balances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   MODULE 3: RECRUITMENT PIPELINE
   ═══════════════════════════════════════════════════════════════ */

exports.getJobPostings = async (req, res) => {
  try {
    const postings = await JobPosting.findAll({
      where: { branch_id: req.branchId },
      include: [{ model: Applicant }],
      order: [['created_at', 'DESC']],
    });
    res.json(postings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createJobPosting = async (req, res) => {
  try {
    const posting = await JobPosting.create({
      ...req.body,
      branch_id: req.branchId,
      posted_by: req.user.id,
    });
    res.status(201).json(posting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateJobPosting = async (req, res) => {
  try {
    const posting = await JobPosting.findByPk(req.params.id);
    if (!posting) return res.status(404).json({ error: 'Posting not found' });
    await posting.update(req.body);
    res.json(posting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteJobPosting = async (req, res) => {
  try {
    await JobPosting.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Job posting deleted.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getApplicants = async (req, res) => {
  try {
    const where = {};
    if (req.query.job_id) where.job_posting_id = req.query.job_id;
    const applicants = await Applicant.findAll({
      where,
      include: [{ model: JobPosting }],
      order: [['created_at', 'DESC']],
    });
    res.json(applicants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createApplicant = async (req, res) => {
  try {
    const applicant = await Applicant.create(req.body);
    res.status(201).json(applicant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateApplicant = async (req, res) => {
  try {
    const applicant = await Applicant.findByPk(req.params.id);
    if (!applicant) return res.status(404).json({ error: 'Applicant not found' });
    await applicant.update(req.body);
    res.json(applicant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.hireApplicant = async (req, res) => {
  try {
    const applicant = await Applicant.findByPk(req.params.id, {
      include: [{ model: JobPosting }],
    });
    if (!applicant) return res.status(404).json({ error: 'Applicant not found' });

    // Create user account
    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');
    const rawPassword = crypto.randomBytes(16).toString('hex');
    const user = await User.create({
      name: applicant.name,
      email: applicant.email,
      password: await bcrypt.hash(rawPassword, 10),
      branch_id: req.branchId,
      role: 'unassigned',
    });

    // Create staff profile
    await StaffProfile.create({
      user_id: user.id,
      branch_id: req.branchId,
      designation: applicant.JobPosting?.title || 'New Hire',
      base_salary: 0,
      joining_date: new Date().toISOString().split('T')[0],
    });

    await applicant.update({ stage: 'hired' });

    res.json({ message: 'Applicant hired successfully.', user: { id: user.id, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   MODULE 4: DOCUMENT VAULT
   ═══════════════════════════════════════════════════════════════ */

exports.getDocuments = async (req, res) => {
  try {
    const where = { branch_id: req.branchId };
    if (req.query.user_id) where.user_id = req.query.user_id;
    const docs = await StaffDocument.findAll({
      where,
      include: [
        { model: User, as: 'Staff', attributes: ['id', 'name'] },
        { model: User, as: 'Uploader', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createDocument = async (req, res) => {
  try {
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : req.body.file_url;
    const doc = await StaffDocument.create({
      ...req.body,
      file_url: fileUrl,
      file_type: req.file ? req.file.mimetype : req.body.file_type,
      branch_id: req.branchId,
      uploaded_by: req.user.id,
    });
    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    await StaffDocument.destroy({ where: { id: req.params.id, branch_id: req.branchId } });
    res.json({ message: 'Document deleted.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getExpiringDocuments = async (req, res) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const docs = await StaffDocument.findAll({
      where: {
        branch_id: req.branchId,
        expiry_date: { [Op.between]: [new Date(), thirtyDaysFromNow] },
      },
      include: [{ model: User, as: 'Staff', attributes: ['id', 'name'] }],
    });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   MODULE 5: PERFORMANCE REVIEWS
   ═══════════════════════════════════════════════════════════════ */

exports.getReviews = async (req, res) => {
  try {
    const where = { branch_id: req.branchId };
    if (req.query.user_id) where.user_id = req.query.user_id;
    const reviews = await PerformanceReview.findAll({
      where,
      include: [
        { model: User, as: 'Employee', attributes: ['id', 'name', 'role'] },
        { model: User, as: 'Reviewer', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createReview = async (req, res) => {
  try {
    const review = await PerformanceReview.create({
      ...req.body,
      reviewer_id: req.user.id,
      branch_id: req.branchId,
    });
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const review = await PerformanceReview.findByPk(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    await review.update(req.body);
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await PerformanceReview.findAll({
      where: { user_id: req.user.id },
      include: [{ model: User, as: 'Reviewer', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   MODULE 6: SHIFT & SCHEDULE
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
    const shift = await Shift.create({ ...req.body, branch_id: req.branchId });
    res.status(201).json(shift);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateShift = async (req, res) => {
  try {
    const shift = await Shift.findByPk(req.params.id);
    if (!shift) return res.status(404).json({ error: 'Shift not found' });
    await shift.update(req.body);
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
    const schedule = await StaffSchedule.create(req.body);
    res.status(201).json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    await StaffSchedule.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Schedule removed.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   MODULE 8: ORG CHART
   ═══════════════════════════════════════════════════════════════ */

exports.getOrgChart = async (req, res) => {
  try {
    const staff = await User.findAll({
      where: {
        branch_id: req.branchId,
        role: { [Op.notIn]: ['student', 'guardian'] },
      },
      include: [{ model: StaffProfile }],
      attributes: ['id', 'name', 'email', 'role'],
    });

    const tree = staff.map(s => ({
      id: s.id,
      name: s.name,
      role: s.role,
      designation: s.StaffProfile?.designation || 'Unassigned',
      department: s.StaffProfile?.department || 'General',
      reports_to: s.StaffProfile?.reports_to || null,
      profile_photo: s.StaffProfile?.profile_photo || null,
    }));

    res.json(tree);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   MODULE 9: HR DASHBOARD
   ═══════════════════════════════════════════════════════════════ */

exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const branchId = req.branchId;

    const totalStaff = await User.count({
      where: { branch_id: branchId, role: { [Op.notIn]: ['student', 'guardian'] } },
    });

    const presentToday = await StaffAttendance.count({
      where: { branch_id: branchId, date: today, status: { [Op.in]: ['present', 'late'] } },
    });

    const onLeaveToday = await StaffAttendance.count({
      where: { branch_id: branchId, date: today, status: 'on_leave' },
    });

    const pendingLeaves = await LeaveRequest.count({
      where: { branch_id: branchId, status: 'pending' },
    });

    const openPositions = await JobPosting.count({
      where: { branch_id: branchId, status: 'open' },
    });

    const totalApplicants = await Applicant.count({
      include: [{ model: JobPosting, where: { branch_id: branchId }, attributes: [] }],
    });

    res.json({
      totalStaff,
      presentToday,
      onLeaveToday,
      absentToday: totalStaff - presentToday - onLeaveToday,
      pendingLeaves,
      openPositions,
      totalApplicants,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBirthdays = async (req, res) => {
  try {
    const month = new Date().getMonth() + 1;
    const profiles = await StaffProfile.findAll({
      where: {
        branch_id: req.branchId,
        [Op.and]: [sequelize.where(sequelize.fn('MONTH', sequelize.col('date_of_birth')), month)]
      },
      include: [{ model: User, attributes: ['id', 'name', 'email'] }],
    });
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAnniversaries = async (req, res) => {
  try {
    const month = new Date().getMonth() + 1;
    const profiles = await StaffProfile.findAll({
      where: {
        branch_id: req.branchId,
        [Op.and]: [sequelize.where(sequelize.fn('MONTH', sequelize.col('joining_date')), month)]
      },
      include: [{ model: User, attributes: ['id', 'name', 'email'] }],
    });
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
