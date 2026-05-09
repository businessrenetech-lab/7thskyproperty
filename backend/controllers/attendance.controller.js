const Attendance = require('../models/Attendance');
const automationService = require('../services/automation.service');
const Student = require('../models/Student');
const User = require('../models/User');
const Batch = require('../models/Batch');
const { Op } = require('sequelize');

exports.markAttendance = async (req, res) => {
  try {
    const { batch_id, date, attendance_data } = req.body;
    // attendance_data looks like: [{ student_id: 1, status: 'present' }, ...]
    if (!batch_id || !date || !Array.isArray(attendance_data)) {
      return res.status(400).json({ error: 'batch_id, date, and attendance_data are required' });
    }

    const batch = await Batch.findOne({ where: { id: batch_id, branch_id: req.branchId } });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const studentIds = [...new Set((attendance_data || []).map((record) => Number(record.student_id)).filter(Boolean))];
    const students = await Student.findAll({
      where: { id: { [Op.in]: studentIds }, branch_id: req.branchId, batch_id },
      include: [User]
    });
    const studentsById = new Map(students.map((student) => [Number(student.id), student]));
    if (studentsById.size !== studentIds.length) {
      return res.status(400).json({ error: 'One or more students do not belong to this branch and batch' });
    }

    const records = await Promise.all(attendance_data.map(async (record) => {
      const [attendance, created] = await Attendance.findOrCreate({
        where: {
          branch_id: req.branchId,
          batch_id,
          student_id: record.student_id,
          date
        },
        defaults: {
          branch_id: req.branchId,
          status: record.status,
          method: 'manual'
        }
      });

      if (!created) {
        attendance.status = record.status;
        await attendance.save();
      }

      if (record.status === 'absent') {
        const student = studentsById.get(Number(record.student_id));
        automationService.processTrigger('student_absent', {
          student_id: record.student_id,
          student_name: student?.User?.name,
          phone: student?.User?.phone,
          branch_id: req.branchId,
          date: date
        });
      }

      return attendance;
    }));

    res.json({ message: 'Attendance marked successfully', records });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBatchAttendance = async (req, res) => {
  try {
    const { batch_id, date } = req.query;
    if (!batch_id) return res.status(400).json({ error: 'batch_id is required' });

    const batch = await Batch.findOne({ where: { id: batch_id, branch_id: req.branchId } });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const where = { branch_id: req.branchId, batch_id };
    if (date) where.date = date;

    const attendance = await Attendance.findAll({
      where,
      include: [{ model: Student, include: [User] }]
    });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getStudentAttendance = async (req, res) => {
  try {
    const { student_id } = req.params;
    const student = await Student.findOne({ where: { id: student_id, branch_id: req.branchId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const attendance = await Attendance.findAll({
      where: { branch_id: req.branchId, student_id },
      include: [Batch]
    });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyAttendance = async (req, res) => {
  try {
    // Find the student record for this user
    const student = await Student.findOne({ where: { user_id: req.user.id, branch_id: req.branchId } });
    if (!student) return res.status(404).json({ error: 'Student record not found' });

    const attendance = await Attendance.findAll({
      where: { branch_id: req.branchId, student_id: student.id },
      include: [Batch]
    });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
