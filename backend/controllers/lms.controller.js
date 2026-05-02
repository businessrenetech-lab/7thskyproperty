const Batch = require('../models/Batch');
const Course = require('../models/Course');
const User = require('../models/User');
const Student = require('../models/Student');
const { Op } = require('sequelize');
const { injectBranchFilter } = require('../middleware/branch.middleware');

const getEffectiveBranchId = (req) => req.scopedBranchId || req.branchId;

const parseTimeToMinutes = (time) => {
  if (!time || typeof time !== 'string' || !time.includes(':')) return null;
  const [hour, minute] = time.split(':').map((part) => Number(part));
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return (hour * 60) + minute;
};

const minutesToHHMM = (minutes) => {
  const hour = Math.floor(minutes / 60).toString().padStart(2, '0');
  const minute = (minutes % 60).toString().padStart(2, '0');
  return `${hour}:${minute}`;
};

const normalizeSchedule = (schedule) => {
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) {
    return { error: 'Schedule must include day and time configuration' };
  }

  const days = Array.isArray(schedule.days) ? schedule.days : [];
  const cleanDays = [...new Set(days.map((day) => String(day).toLowerCase().trim()))]
    .filter((day) => ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(day));

  if (!cleanDays.length) {
    return { error: 'Select at least one day for the batch schedule' };
  }

  const startMinutes = parseTimeToMinutes(schedule.start_time);
  if (startMinutes === null) {
    return { error: 'Invalid start time selected for batch schedule' };
  }

  const durationMinutes = Number(schedule.duration_minutes || 120);
  if (!Number.isInteger(durationMinutes) || durationMinutes < 30 || durationMinutes > 240) {
    return { error: 'Duration must be between 30 and 240 minutes' };
  }

  const endMinutes = startMinutes + durationMinutes;
  if (endMinutes > (24 * 60)) {
    return { error: 'Batch end time must stay within the same day' };
  }

  return {
    value: {
      days: cleanDays,
      start_time: minutesToHHMM(startMinutes),
      duration_minutes: durationMinutes,
      end_time: minutesToHHMM(endMinutes)
    }
  };
};

const hasDateOverlap = (startA, endA, startB, endB) => {
  if (!startA || !endA || !startB || !endB) return false;
  return (new Date(startA) <= new Date(endB)) && (new Date(startB) <= new Date(endA));
};

const hasTimeOverlap = (startA, endA, startB, endB) => {
  const startAMin = parseTimeToMinutes(startA);
  const endAMin = parseTimeToMinutes(endA);
  const startBMin = parseTimeToMinutes(startB);
  const endBMin = parseTimeToMinutes(endB);

  if ([startAMin, endAMin, startBMin, endBMin].some((value) => value === null)) return false;
  return startAMin < endBMin && startBMin < endAMin;
};

const intersectsDays = (daysA = [], daysB = []) => daysA.some((day) => daysB.includes(day));

const validateTrainerScheduleConflict = async ({ branchId, trainerId, batchId, startDate, endDate, schedule }) => {
  if (!trainerId || !schedule || !schedule.days?.length) return null;

  const where = {
    branch_id: branchId,
    trainer_id: trainerId,
    start_date: { [Op.lte]: endDate },
    end_date: { [Op.gte]: startDate }
  };

  if (batchId) {
    where.id = { [Op.ne]: batchId };
  }

  const existingBatches = await Batch.findAll({ where });

  const conflict = existingBatches.find((existing) => {
    const existingSchedule = existing.schedule || {};
    if (!existingSchedule.days || !existingSchedule.start_time || !existingSchedule.end_time) return false;
    if (!hasDateOverlap(startDate, endDate, existing.start_date, existing.end_date)) return false;
    if (!intersectsDays(schedule.days, existingSchedule.days)) return false;
    return hasTimeOverlap(
      schedule.start_time,
      schedule.end_time,
      existingSchedule.start_time,
      existingSchedule.end_time
    );
  });

  return conflict || null;
};

// Get all batches (scoped by branch)
exports.getAllBatches = async (req, res) => {
  try {
    const branchId = getEffectiveBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Please select a specific branch' });

    const queryOptions = injectBranchFilter(req, {
      include: [
        { model: Course, attributes: ['id', 'title'] },
        { model: User, as: 'Trainer', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const batches = await Batch.findAll(queryOptions);
    const batchIds = batches.map((batch) => batch.id);

    if (!batchIds.length) return res.json([]);

    const students = await Student.findAll({
      where: { branch_id: branchId, batch_id: { [Op.in]: batchIds } },
      include: [{ model: User, attributes: ['name'] }],
      attributes: ['id', 'batch_id']
    });

    const aggregation = students.reduce((acc, student) => {
      const batchId = student.batch_id;
      if (!acc[batchId]) acc[batchId] = { count: 0, names: [] };
      acc[batchId].count += 1;
      if (student.User?.name && acc[batchId].names.length < 4) acc[batchId].names.push(student.User.name);
      return acc;
    }, {});

    const payload = batches.map((batch) => {
      const details = aggregation[batch.id] || { count: 0, names: [] };
      return {
        ...batch.toJSON(),
        enrolled_count: details.count,
        enrolled_students_preview: details.names
      };
    });

    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single batch by ID with detail
exports.getBatchById = async (req, res) => {
  try {
    const branchId = getEffectiveBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Please select a specific branch' });

    const batch = await Batch.findOne({
      where: { id: req.params.id, branch_id: branchId },
      include: [
        { model: Course, attributes: ['id', 'title'] },
        { model: User, as: 'Trainer', attributes: ['id', 'name'] }
      ]
    });

    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    // Aggregate enrolled count
    const studentsCount = await Student.count({
      where: { branch_id: branchId, batch_id: batch.id }
    });

    res.json({
      ...batch.toJSON(),
      enrolled_count: studentsCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Create a new batch
exports.createBatch = async (req, res) => {
  try {
    const branchId = getEffectiveBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Please select a specific branch' });

    const { course_id, code, trainer_id, name, schedule, start_date, end_date, capacity } = req.body;

    const normalized = normalizeSchedule(schedule);
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    const course = await Course.findOne({ where: { id: course_id, branch_id: branchId } });
    if (!course) return res.status(400).json({ error: 'Invalid course selected for this branch' });

    if (trainer_id) {
      const trainer = await User.findOne({ where: { id: trainer_id, branch_id: branchId } });
      if (!trainer) return res.status(400).json({ error: 'Invalid trainer selected for this branch' });

      const conflictBatch = await validateTrainerScheduleConflict({
        branchId,
        trainerId: trainer_id,
        startDate: start_date,
        endDate: end_date,
        schedule: normalized.value
      });

      if (conflictBatch) {
        return res.status(400).json({
          error: `Trainer is already assigned to batch ${conflictBatch.code} at an overlapping day/time slot`
        });
      }
    }

    const batch = await Batch.create({
      branch_id: branchId,
      course_id,
      code,
      trainer_id,
      name,
      schedule: normalized.value,
      start_date,
      end_date,
      capacity,
      status: 'enrolling'
    });

    res.status(201).json(batch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update an existing batch
exports.updateBatch = async (req, res) => {
  try {
    const branchId = getEffectiveBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Please select a specific branch' });

    const { id } = req.params;
    const {
      course_id,
      code,
      trainer_id,
      name,
      schedule,
      start_date,
      end_date,
      capacity,
      status
    } = req.body;

    const batch = await Batch.findOne({ where: { id, branch_id: branchId } });
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    if (course_id) {
      const course = await Course.findOne({ where: { id: course_id, branch_id: branchId } });
      if (!course) {
        return res.status(400).json({ error: 'Invalid course selected for this branch' });
      }
    }

    if (trainer_id) {
      const trainer = await User.findOne({ where: { id: trainer_id, branch_id: branchId } });
      if (!trainer) {
        return res.status(400).json({ error: 'Invalid trainer selected for this branch' });
      }
    }

    const normalized = normalizeSchedule(schedule);
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    if (trainer_id) {
      const conflictBatch = await validateTrainerScheduleConflict({
        branchId,
        trainerId: trainer_id,
        batchId: Number(id),
        startDate: start_date,
        endDate: end_date,
        schedule: normalized.value
      });

      if (conflictBatch) {
        return res.status(400).json({
          error: `Trainer is already assigned to batch ${conflictBatch.code} at an overlapping day/time slot`
        });
      }
    }

    await batch.update({
      course_id,
      code,
      trainer_id: trainer_id || null,
      name,
      schedule: normalized.value,
      start_date,
      end_date,
      capacity,
      ...(status ? { status } : {})
    });

    const updatedBatch = await Batch.findOne({
      where: { id: batch.id, branch_id: branchId },
      include: [
        { model: Course, attributes: ['id', 'title'] },
        { model: User, as: 'Trainer', attributes: ['id', 'name'] }
      ]
    });

    res.json(updatedBatch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update batch status
exports.updateBatchStatus = async (req, res) => {
  try {
    const branchId = getEffectiveBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Please select a specific branch' });

    const { id } = req.params;
    const { status } = req.body;
    
    const batch = await Batch.findOne({ 
      where: { id, branch_id: branchId }
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    batch.status = status;
    await batch.save();

    res.json(batch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get students assigned to a batch
exports.getBatchStudents = async (req, res) => {
  try {
    const branchId = getEffectiveBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Please select a specific branch' });

    const { id } = req.params;

    const batch = await Batch.findOne({ where: { id, branch_id: branchId } });
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const students = await Student.findAll({
      where: { branch_id: branchId, batch_id: id },
      include: [{ model: User, attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']]
    });

    const payload = students.map((student) => ({
      id: student.id,
      user_id: student.user_id,
      name: student.User?.name || null,
      email: student.User?.email || null,
      mobile_no: student.mobile_no || null,
      enrollment_date: student.enrollment_date,
      status: student.status
    }));

    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCourses = async (req, res) => {
  try {
    const queryOptions = injectBranchFilter(req, {});
    const courses = await Course.findAll(queryOptions);
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const data = { ...req.body, branch_id: req.branchId };
    const course = await Course.create(data);
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findOne({ where: { id, branch_id: req.branchId } });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    
    await course.update(req.body);
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.uploadCourseImageHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    const imageUrl = `/uploads/courses/${req.file.filename}`;
    res.json({ url: imageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const communicationService = require('../services/communication.service');

// Bulk send SMS or Email to batch students
exports.notifyBatchStudents = async (req, res) => {
  try {
    const branchId = getEffectiveBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Please select a specific branch' });

    const { id } = req.params;
    const { type, subject, message } = req.body; // type: 'sms' or 'email'

    if (!type || !message) {
      return res.status(400).json({ error: 'Notification type and message are required' });
    }

    const batch = await Batch.findOne({ where: { id, branch_id: branchId } });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const students = await Student.findAll({
      where: { branch_id: branchId, batch_id: id },
      include: [{ model: User, attributes: ['name', 'email'] }]
    });

    if (!students || students.length === 0) {
      return res.status(400).json({ error: 'No students enrolled in this batch to notify.' });
    }

    let successCount = 0;
    const isEmail = type === 'email';

    for (const student of students) {
      const destination = isEmail ? student.User?.email : student.mobile_no;
      if (!destination) continue;

      const recipientMock = {
        name: student.User?.name || 'Student',
        phone: student.mobile_no || '',
        email: student.User?.email || '',
        course_interest: batch.name || 'our course'
      };

      const parsedSubject = isEmail ? communicationService.parseTemplate(subject || 'Notification from Language Academy', recipientMock) : '';
      const parsedBody = communicationService.parseTemplate(message, recipientMock);

      let dispatchResult = { success: false };
      if (isEmail) {
        dispatchResult = await communicationService.sendEmail(destination, parsedSubject, parsedBody, []);
      } else {
        dispatchResult = await communicationService.sendSMS(destination, parsedBody);
      }

      if (dispatchResult.success) {
        successCount++;
      }
    }

    res.json({
      message: `Notification dispatch complete. Successfully sent to ${successCount} out of ${students.length} students.`,
      successCount,
      totalStudents: students.length
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
