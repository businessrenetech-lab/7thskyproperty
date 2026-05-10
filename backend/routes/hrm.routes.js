const express = require('express');
const router = express.Router();
const hrm = require('../controllers/hrm.controller');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');
const { branchMiddleware } = require('../middleware/branch.middleware');
const multer = require('multer');
const path = require('path');

// File upload for documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `doc_${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage });

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

router.use(authMiddleware);

// ─── Self-service Check-In (any authenticated user) ─────────
router.post('/attendance/self-checkin', branchMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, action } = req.body;
    if (['student', 'guardian'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only staff users can check in or out.' });
    }

    const today = getDhakaDate();
    const now = getDhakaTime();
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

    // Check if already checked in today
    const existing = await require('../models/StaffAttendance').findOne({
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
    const record = await require('../models/StaffAttendance').create({
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
});

router.use(roleMiddleware(['super_admin', 'branch_admin', 'hr']));
router.use(branchMiddleware);
router.post('/attendance/mark', hrm.markStaffAttendance);
router.get('/attendance', hrm.getStaffAttendance);
router.get('/attendance/summary', hrm.getStaffAttendanceSummary);
router.get('/attendance/my', hrm.getMyStaffAttendance);

// ─── Leave Management ────────────────────────────────────────
router.get('/leave-types', hrm.getLeaveTypes);
router.post('/leave-types', hrm.createLeaveType);
router.get('/leaves', hrm.getLeaveRequests);
router.post('/leaves', hrm.createLeaveRequest);
router.patch('/leaves/:id/approve', hrm.approveLeave);
router.patch('/leaves/:id/reject', hrm.rejectLeave);
router.get('/leaves/my', hrm.getMyLeaves);
router.get('/leaves/balance', hrm.getLeaveBalance);

// ─── Recruitment ─────────────────────────────────────────────
router.get('/jobs', hrm.getJobPostings);
router.post('/jobs', hrm.createJobPosting);
router.patch('/jobs/:id', hrm.updateJobPosting);
router.delete('/jobs/:id', hrm.deleteJobPosting);
router.get('/applicants', hrm.getApplicants);
router.post('/applicants', hrm.createApplicant);
router.patch('/applicants/:id', hrm.updateApplicant);
router.post('/applicants/:id/hire', hrm.hireApplicant);

// ─── Documents ───────────────────────────────────────────────
router.get('/documents', hrm.getDocuments);
router.post('/documents', upload.single('file'), hrm.createDocument);
router.delete('/documents/:id', hrm.deleteDocument);
router.get('/documents/expiring', hrm.getExpiringDocuments);

// ─── Performance Reviews ────────────────────────────────────
router.get('/reviews', hrm.getReviews);
router.post('/reviews', hrm.createReview);
router.patch('/reviews/:id', hrm.updateReview);
router.get('/reviews/my', hrm.getMyReviews);

// ─── Shifts & Schedules ─────────────────────────────────────
router.get('/shifts', hrm.getShifts);
router.post('/shifts', hrm.createShift);
router.patch('/shifts/:id', hrm.updateShift);
router.get('/schedules', hrm.getSchedules);
router.post('/schedules', hrm.createSchedule);
router.delete('/schedules/:id', hrm.deleteSchedule);

// ─── Org Chart ───────────────────────────────────────────────
router.get('/org-chart', hrm.getOrgChart);

// ─── Dashboard ───────────────────────────────────────────────
router.get('/dashboard/stats', hrm.getDashboardStats);
router.get('/dashboard/birthdays', hrm.getBirthdays);
router.get('/dashboard/anniversaries', hrm.getAnniversaries);

module.exports = router;
