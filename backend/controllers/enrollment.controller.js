const Enrollment = require('../models/Enrollment');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const { injectBranchFilter } = require('../middleware/branch.middleware');
const adminNotify = require('../services/adminNotification.service');

exports.createEnrollment = async (req, res) => {
  try {
    const { student_id, batch_id, total_fee, discount } = req.body;
    const [student, batch] = await Promise.all([
      Student.findOne({ where: { id: student_id, branch_id: req.branchId } }),
      Batch.findOne({ where: { id: batch_id, branch_id: req.branchId } })
    ]);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    
    const enrollment = await Enrollment.create({
      branch_id: req.branchId,
      student_id,
      batch_id,
      total_fee,
      discount: discount || 0,
      paid_amount: 0,
      status: 'pending'
    });

    res.status(201).json(enrollment);

    adminNotify.sendEnrollmentNotificationEmail({
      enrollment,
      student,
      batch,
      source: 'manual enrollment',
    }).catch(err => console.error('[ADMIN_NOTIFY] Manual enrollment email failed:', err.message));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEnrollments = async (req, res) => {
  try {
    const queryOptions = injectBranchFilter(req, {
      include: [Student, Batch]
    });
    const enrollments = await Enrollment.findAll(queryOptions);
    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
