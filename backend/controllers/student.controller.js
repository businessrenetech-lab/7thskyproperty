const Student = require('../models/Student');
const User = require('../models/User');
const Batch = require('../models/Batch');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Invoice = require('../models/Invoice');
const Activity = require('../models/Activity');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db.config');
const { Op } = require('sequelize');
const { sendPartnerAccessRequestEmail } = require('../services/communication.service');

const getEffectiveBranchId = (req) => (
  Object.prototype.hasOwnProperty.call(req, 'scopedBranchId') ? req.scopedBranchId : req.branchId
);

const withBranchScope = (branchId, where = {}) => (
  branchId === null ? where : { ...where, branch_id: branchId }
);

const normalizeEducationDetails = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  }
  return [];
};

const normalizeEmploymentDetails = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return value;
};

const normalizePostCourseGoalType = (value) => {
  if (value === 'specific_country' || value === 'another_purpose') return value;
  const normalized = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (['study_abroad', 'work', 'migration_visa', 'migration_and_visa_applications'].includes(normalized)) return 'specific_country';
  if (['professional_registration', 'build_confidence', 'build_confidence_in_english', 'others', 'other'].includes(normalized)) return 'another_purpose';
  return null;
};

const normalizeEnglishLevel = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  return ['beginner', 'intermediate', 'expert'].includes(normalized) ? normalized : null;
};

const normalizeNullableText = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const OPEN_FEE_STATUSES = ['pending', 'partial', 'overdue'];

const deriveStudentState = (student, feeSummary, rejectedFees = [], enrollmentSummary = null) => {
  const status = student.status;
  const batchEndDate = student.Batch?.end_date ? new Date(student.Batch.end_date) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (status === 'dropped') return 'dropped';
  if (feeSummary && Number(feeSummary.due || 0) > 0 && OPEN_FEE_STATUSES.includes(feeSummary.status)) return 'fees_pending';
  if (rejectedFees.length > 0) return 'payment_rejected';

  // If enrollment exists but is still pending (no payment made), treat as fees_pending
  if (enrollmentSummary && enrollmentSummary.status === 'pending' && Number(enrollmentSummary.paid_amount || 0) === 0) return 'fees_pending';

  // If student has a batch but NO enrollment and NO paid invoice at all, treat as fees_pending
  if (student.batch_id && student.Batch && !enrollmentSummary && !feeSummary) return 'fees_pending';

  if (!student.batch_id || !student.Batch) return 'unassigned';

  if (batchEndDate && !Number.isNaN(batchEndDate.getTime())) {
    batchEndDate.setHours(0, 0, 0, 0);
    if (today >= batchEndDate) return 'course_completed';
  }

  return 'enrolled';
};

const buildFeeSummaryMap = async (branchId, studentIds) => {
  if (!studentIds.length) return new Map();

  const invoices = await Invoice.findAll({
    where: withBranchScope(branchId, { student_id: { [Op.in]: studentIds } }),
    attributes: ['id', 'student_id', 'enrollment_id', 'amount', 'paid', 'status', 'due_date', 'invoice_no'],
    order: [['issued_at', 'DESC']]
  });

  const summaryMap = new Map();
  invoices.forEach((invoice) => {
    const current = summaryMap.get(invoice.student_id);
    const candidate = {
      invoice_id: invoice.id,
      enrollment_id: invoice.enrollment_id,
      invoice_no: invoice.invoice_no,
      amount: Number(invoice.amount || 0),
      paid: Number(invoice.paid || 0),
      due: Number(invoice.amount || 0) - Number(invoice.paid || 0),
      status: invoice.status,
      due_date: invoice.due_date
    };

    if (!current || (Number(candidate.due || 0) > 0 && OPEN_FEE_STATUSES.includes(candidate.status))) {
      summaryMap.set(invoice.student_id, candidate);
    }
  });

  return summaryMap;
};

const buildRejectedFeeMap = async (branchId, studentIds) => {
  if (!studentIds.length) return new Map();

  const invoices = await Invoice.findAll({
    where: withBranchScope(branchId, { status: 'rejected' }),
    attributes: ['id', 'student_id', 'enrollment_id', 'invoice_no', 'amount', 'paid', 'status', 'notes', 'updated_at'],
    include: [
      {
        model: Enrollment,
        attributes: ['student_id'],
        required: false
      }
    ],
    order: [['updated_at', 'DESC']]
  });

  const rejectedMap = new Map();
  invoices.forEach((invoice) => {
    const resolvedStudentId = invoice.student_id || invoice.Enrollment?.student_id;
    if (!resolvedStudentId || !studentIds.includes(resolvedStudentId)) return;

    const current = rejectedMap.get(resolvedStudentId) || [];
    current.push({
      invoice_id: invoice.id,
      enrollment_id: invoice.enrollment_id,
      invoice_no: invoice.invoice_no,
      amount: Number(invoice.amount || 0),
      paid: Number(invoice.paid || 0),
      status: invoice.status,
      note: invoice.notes,
      rejected_at: invoice.updated_at
    });
    rejectedMap.set(resolvedStudentId, current);
  });

  return rejectedMap;
};

const buildEnrollmentSummaryMap = async (branchId, studentIds) => {
  if (!studentIds.length) return new Map();

  const enrollments = await Enrollment.findAll({
    where: withBranchScope(branchId, { student_id: { [Op.in]: studentIds } }),
    attributes: ['id', 'student_id', 'batch_id', 'total_fee', 'paid_amount', 'status'],
    order: [['created_at', 'DESC']]
  });

  const summaryMap = new Map();
  enrollments.forEach((enrollment) => {
    // Keep the most recent enrollment per student
    if (!summaryMap.has(enrollment.student_id)) {
      summaryMap.set(enrollment.student_id, {
        enrollment_id: enrollment.id,
        total_fee: Number(enrollment.total_fee || 0),
        paid_amount: Number(enrollment.paid_amount || 0),
        status: enrollment.status
      });
    }
  });

  return summaryMap;
};

const decorateStudent = (student, feeSummary = null, rejectedFees = [], enrollmentSummary = null) => {
  const derivedState = deriveStudentState(student, feeSummary, rejectedFees, enrollmentSummary);
  const completionDate = derivedState === 'course_completed' ? student.Batch?.end_date : null;
  return {
    ...student.toJSON(),
    derived_state: derivedState,
    fee_summary: feeSummary,
    rejected_fees: rejectedFees,
    enrollment_summary: enrollmentSummary,
    is_course_completed: derivedState === 'course_completed',
    has_success_record: Boolean(student.final_course_result || student.success_destination_country || student.success_recorded_at),
    course_completion_date: completionDate,
    is_premium_pte: student.plan_type === 'premium'
  };
};

exports.getAllStudents = async (req, res) => {
  try {
    const branchId = getEffectiveBranchId(req);
    if (branchId === undefined) return res.status(400).json({ error: 'Please select a specific branch' });

    const students = await Student.findAll({
      where: withBranchScope(branchId),
      include: [
        { model: User },
        { model: Batch, include: [{ model: Course, attributes: ['id', 'title'] }] }
      ],
      order: [['created_at', 'DESC']]
    });

    const studentIds = students.map((student) => student.id);
    const [feeSummaryMap, rejectedFeeMap, enrollmentSummaryMap] = await Promise.all([
      buildFeeSummaryMap(branchId, studentIds),
      buildRejectedFeeMap(branchId, studentIds),
      buildEnrollmentSummaryMap(branchId, studentIds)
    ]);
    res.json(students.map((student) => decorateStudent(
      student,
      feeSummaryMap.get(student.id) || null,
      rejectedFeeMap.get(student.id) || [],
      enrollmentSummaryMap.get(student.id) || null
    )));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const branchId = getEffectiveBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Please select a specific branch' });

    const student = await Student.findOne({
      where: { id: req.params.id, branch_id: branchId },
      include: [
        { model: User },
        { model: Batch, include: [{ model: Course, attributes: ['id', 'title', 'duration_weeks'] }] }
      ]
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    const [feeSummaryMap, rejectedFeeMap, enrollmentSummaryMap] = await Promise.all([
      buildFeeSummaryMap(branchId, [student.id]),
      buildRejectedFeeMap(branchId, [student.id]),
      buildEnrollmentSummaryMap(branchId, [student.id])
    ]);
    res.json(decorateStudent(
      student,
      feeSummaryMap.get(student.id) || null,
      rejectedFeeMap.get(student.id) || [],
      enrollmentSummaryMap.get(student.id) || null
    ));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createStudent = async (req, res) => {
  const branchId = getEffectiveBranchId(req);
  if (!branchId) return res.status(400).json({ error: 'Please select a specific branch' });

  const t = await sequelize.transaction();
  try {
    const { 
      name, email, password, batch_id, guardian_id, course_id,
      first_name, middle_name, last_name, father_name, mother_name,
      mobile_no, nid_birth_cert, date_of_birth, religion, nationality,
      gender, blood_group, marital_status,
      emergency_contact_name, emergency_contact_relation, emergency_contact_phone,
      current_address, permanent_address,
      passport_no, passport_expiry, visa_status,
      photograph_url, educational_details, employment_details,
      profession, lead_source,
      post_course_goal_type, target_country, english_level,
      referred_by, referral_amount
    } = req.body;

    const normalizedGoalType = normalizePostCourseGoalType(post_course_goal_type);
    const normalizedTargetCountry = normalizedGoalType === 'specific_country' ? String(target_country || '').trim() || null : null;
    const normalizedEnglishLevel = normalizeEnglishLevel(english_level);
    
    // Fallback for name if first_name/last_name provided but not name
    const fullName = name || `${first_name || ''} ${last_name || ''}`.trim() || 'No Name Provided';

    const generatedPassword = password ? null : require('crypto').randomBytes(12).toString('base64url');
    const rawPassword = password || generatedPassword;
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    
    // Create User account
    const user = await User.create({
      name: fullName,
      email,
      password: hashedPassword,
      role: 'student',
      branch_id: branchId
    }, { transaction: t });

    // Create Student record
    const student = await Student.create({
      user_id: user.id,
      branch_id: branchId,
      batch_id: batch_id || null,
      guardian_id: guardian_id || null,
      first_name, middle_name, last_name, father_name, mother_name,
      mobile_no, nid_birth_cert, date_of_birth, religion, 
      nationality: nationality || 'Bangladeshi',
      gender, blood_group, marital_status,
      emergency_contact_name, emergency_contact_relation, emergency_contact_phone,
      current_address, permanent_address,
      passport_no, passport_expiry, visa_status,
      photograph_url, profession, lead_source,
      referred_by, referral_amount: Number(referral_amount) || 0,
      educational_details: normalizeEducationDetails(educational_details),
      employment_details: normalizeEmploymentDetails(employment_details),
      post_course_goal_type: normalizedGoalType,
      target_country: normalizedTargetCountry,
      english_level: normalizedEnglishLevel,
      enrollment_date: new Date()
    }, { transaction: t });

    let invoice = null;
    let enrollment = null;

    if (course_id) {
      const course = await Course.findByPk(course_id, { transaction: t });
      if (course) {
        enrollment = await Enrollment.create({
          branch_id: branchId,
          student_id: student.id,
          batch_id: batch_id || null,
          total_fee: course.base_fee,
          discount: 0,
          paid_amount: 0,
          status: 'pending'
        }, { transaction: t });

        invoice = await Invoice.create({
          branch_id: branchId,
          invoice_no: `INV-${Date.now()}-${student.id}`,
          enrollment_id: enrollment.id,
          student_id: student.id,
          amount: course.base_fee,
          paid: 0,
          status: 'pending',
          due_date: new Date(new Date().setDate(new Date().getDate() + 7)),
          notes: `Direct student entry for ${course.title}. Pending fee collection via POS.`
        }, { transaction: t });
      }
    }

    await t.commit();

    const createdStudent = await Student.findOne({
      where: { id: student.id, branch_id: branchId },
      include: [
        { model: User },
        { model: Batch, include: [{ model: Course, attributes: ['id', 'title'] }] }
      ]
    });

    const feeSummary = invoice ? {
      invoice_id: invoice.id,
      enrollment_id: enrollment?.id || null,
      invoice_no: invoice.invoice_no,
      amount: Number(invoice.amount || 0),
      paid: Number(invoice.paid || 0),
      due: Number(invoice.amount || 0) - Number(invoice.paid || 0),
      status: invoice.status,
      due_date: invoice.due_date
    } : null;

    const enrollmentSummary = enrollment ? {
      enrollment_id: enrollment.id,
      total_fee: Number(enrollment.total_fee || 0),
      paid_amount: Number(enrollment.paid_amount || 0),
      status: enrollment.status
    } : null;

    res.status(201).json({
      user,
      student: decorateStudent(createdStudent, feeSummary, [], enrollmentSummary),
      enrollment,
      invoice,
      temporary_password: generatedPassword
    });
  } catch (error) {
    await t.rollback();
    console.error('[CreateStudent Error]:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.enrollInBatch = async (req, res) => {
  try {
    const branchId = getEffectiveBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Please select a specific branch' });

    const { student_id, batch_id } = req.body;
    const student = await Student.findOne({ where: { id: student_id, branch_id: branchId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const batch = await Batch.findOne({ where: { id: batch_id, branch_id: branchId } });
    if (!batch) return res.status(400).json({ error: 'Invalid batch selected for this branch' });

    student.batch_id = batch_id;
    await student.save();
    res.json({ message: 'Student enrolled in batch', student });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const { target_score, exam_date, mobile_no, current_address } = req.body;
    
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    if (target_score !== undefined) student.target_score = target_score;
    if (exam_date !== undefined) student.exam_date = exam_date;
    if (mobile_no !== undefined) student.mobile_no = mobile_no;
    if (current_address !== undefined) student.current_address = current_address;

    await student.save();

    res.json({ message: 'Profile updated successfully', student });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const branchId = getEffectiveBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Please select a specific branch' });

    const student = await Student.findOne({ where: { id: req.params.id, branch_id: branchId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const {
      first_name, last_name, father_name, mother_name,
      mobile_no, nid_birth_cert, date_of_birth, religion, nationality,
      gender, blood_group, marital_status,
      emergency_contact_name, emergency_contact_relation, emergency_contact_phone,
      current_address, permanent_address,
      passport_no, passport_expiry, visa_status,
      educational_details, employment_details, profession, lead_source,
      post_course_goal_type, target_country, english_level,
      referred_by, referral_amount
    } = req.body;

    if (first_name !== undefined) student.first_name = first_name;
    if (last_name !== undefined) student.last_name = last_name;
    if (father_name !== undefined) student.father_name = father_name;
    if (mother_name !== undefined) student.mother_name = mother_name;
    if (mobile_no !== undefined) student.mobile_no = mobile_no;
    if (nid_birth_cert !== undefined) student.nid_birth_cert = nid_birth_cert;
    if (date_of_birth !== undefined) student.date_of_birth = date_of_birth;
    if (religion !== undefined) student.religion = religion;
    if (nationality !== undefined) student.nationality = nationality;
    if (gender !== undefined) student.gender = gender;
    if (blood_group !== undefined) student.blood_group = blood_group;
    if (marital_status !== undefined) student.marital_status = marital_status;
    if (emergency_contact_name !== undefined) student.emergency_contact_name = emergency_contact_name;
    if (emergency_contact_relation !== undefined) student.emergency_contact_relation = emergency_contact_relation;
    if (emergency_contact_phone !== undefined) student.emergency_contact_phone = emergency_contact_phone;
    if (current_address !== undefined) student.current_address = current_address;
    if (permanent_address !== undefined) student.permanent_address = permanent_address;
    if (passport_no !== undefined) student.passport_no = passport_no;
    if (passport_expiry !== undefined) student.passport_expiry = passport_expiry;
    if (visa_status !== undefined) student.visa_status = visa_status;
    if (profession !== undefined) student.profession = profession;
    if (lead_source !== undefined) student.lead_source = lead_source;
    if (referred_by !== undefined) student.referred_by = referred_by;
    if (referral_amount !== undefined) student.referral_amount = referral_amount;
    if (educational_details !== undefined) student.educational_details = normalizeEducationDetails(educational_details);
    if (employment_details !== undefined) student.employment_details = normalizeEmploymentDetails(employment_details);
    if (post_course_goal_type !== undefined) {
      student.post_course_goal_type = normalizePostCourseGoalType(post_course_goal_type);
      student.target_country = student.post_course_goal_type === 'specific_country' ? String(target_country || '').trim() || null : null;
    }
    if (english_level !== undefined) student.english_level = normalizeEnglishLevel(english_level);

    await student.save();

    // If name changed, update user
    if (first_name || last_name) {
      const user = await User.findByPk(student.user_id);
      if (user) {
        user.name = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'No Name Provided';
        await user.save();
      }
    }

    const updatedStudent = await Student.findOne({
      where: { id: student.id, branch_id: branchId },
      include: [
        { model: User },
        { model: Batch, include: [{ model: Course, attributes: ['id', 'title'] }] }
      ]
    });
    const [feeSummaryMap, rejectedFeeMap, enrollmentSummaryMap] = await Promise.all([
      buildFeeSummaryMap(branchId, [updatedStudent.id]),
      buildRejectedFeeMap(branchId, [updatedStudent.id]),
      buildEnrollmentSummaryMap(branchId, [updatedStudent.id])
    ]);
    res.json(decorateStudent(updatedStudent, feeSummaryMap.get(updatedStudent.id) || null, rejectedFeeMap.get(updatedStudent.id) || [], enrollmentSummaryMap.get(updatedStudent.id) || null));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.uploadPhoto = async (req, res) => {
  try {
    const branchId = getEffectiveBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Please select a specific branch' });

    const student = await Student.findOne({ where: { id: req.params.id, branch_id: branchId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    student.photograph_url = `/uploads/${req.file.filename}`;
    await student.save();

    res.json({ message: 'Photo uploaded', photograph_url: student.photograph_url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getStudentActivities = async (req, res) => {
  try {
    const branchId = getEffectiveBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Please select a specific branch' });

    const activities = await Activity.findAll({
      where: { student_id: req.params.id, branch_id: branchId },
      include: [{ model: User, as: 'Creator', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']]
    });

    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createStudentActivity = async (req, res) => {
  try {
    const branchId = getEffectiveBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Please select a specific branch' });

    const { type, subject, description } = req.body;
    const activity = await Activity.create({
      branch_id: branchId,
      student_id: req.params.id,
      type: type || 'note',
      subject: subject || 'Student Activity',
      description,
      created_by: req.user.id
    });

    const newActivity = await Activity.findByPk(activity.id, {
      include: [{ model: User, as: 'Creator', attributes: ['id', 'name'] }]
    });

    res.status(201).json(newActivity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateStudentManagement = async (req, res) => {
  try {
    const branchId = getEffectiveBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Please select a specific branch' });

    const { id } = req.params;
    const { batch_id, status } = req.body;

    const student = await Student.findOne({ where: { id, branch_id: branchId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (batch_id !== undefined) {
      if (batch_id === null || batch_id === '') {
        student.batch_id = null;
      } else {
        const batch = await Batch.findOne({ where: { id: batch_id, branch_id: branchId } });
        if (!batch) return res.status(400).json({ error: 'Invalid batch selected for this branch' });
        student.batch_id = batch.id;
      }
    }

    if (status !== undefined) {
      if (!['active', 'dropped'].includes(status)) {
        return res.status(400).json({ error: 'Allowed status values are active or dropped' });
      }
      student.status = status;
    }

    await student.save();

    const updatedStudent = await Student.findOne({
      where: { id: student.id, branch_id: branchId },
      include: [
        { model: User },
        { model: Batch, include: [{ model: Course, attributes: ['id', 'title'] }] }
      ]
    });

    const [feeSummaryMap, rejectedFeeMap, enrollmentSummaryMap] = await Promise.all([
      buildFeeSummaryMap(branchId, [updatedStudent.id]),
      buildRejectedFeeMap(branchId, [updatedStudent.id]),
      buildEnrollmentSummaryMap(branchId, [updatedStudent.id])
    ]);
    res.json(decorateStudent(updatedStudent, feeSummaryMap.get(updatedStudent.id) || null, rejectedFeeMap.get(updatedStudent.id) || [], enrollmentSummaryMap.get(updatedStudent.id) || null));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateStudentSuccessRecord = async (req, res) => {
  try {
    const branchId = getEffectiveBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Please select a specific branch' });

    const student = await Student.findOne({ where: { id: req.params.id, branch_id: branchId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const finalCourseResult = normalizeNullableText(req.body.final_course_result);
    const successDestinationCountry = normalizeNullableText(req.body.success_destination_country);
    const successNotes = normalizeNullableText(req.body.success_notes);
    const successRecordedAt = req.body.success_recorded_at ? new Date(req.body.success_recorded_at) : new Date();

    if (req.body.success_recorded_at && Number.isNaN(successRecordedAt.getTime())) {
      return res.status(400).json({ error: 'Invalid success recorded date' });
    }

    student.final_course_result = finalCourseResult;
    student.success_destination_country = successDestinationCountry;
    student.success_notes = successNotes;
    
    const wasRecorded = !!student.success_recorded_at;
    student.success_recorded_at = finalCourseResult || successDestinationCountry || successNotes ? successRecordedAt : null;
    await student.save();

    // Auto-log 'Passed Course' activity if first time saving final course result
    if (!wasRecorded && student.success_recorded_at) {
      await Activity.create({
        branch_id: branchId,
        student_id: student.id,
        type: 'task',
        subject: 'Passed Course',
        description: `Student achieved result: ${finalCourseResult || 'N/A'}. Destination: ${successDestinationCountry || 'N/A'}.`,
        created_by: req.user.id,
        is_done: true,
        completed_at: new Date()
      });
    }

    const updatedStudent = await Student.findOne({
      where: { id: student.id, branch_id: branchId },
      include: [
        { model: User },
        { model: Batch, include: [{ model: Course, attributes: ['id', 'title', 'duration_weeks'] }] }
      ]
    });

    const [feeSummaryMap, rejectedFeeMap, enrollmentSummaryMap] = await Promise.all([
      buildFeeSummaryMap(branchId, [updatedStudent.id]),
      buildRejectedFeeMap(branchId, [updatedStudent.id]),
      buildEnrollmentSummaryMap(branchId, [updatedStudent.id])
    ]);
    res.json(decorateStudent(updatedStudent, feeSummaryMap.get(updatedStudent.id) || null, rejectedFeeMap.get(updatedStudent.id) || [], enrollmentSummaryMap.get(updatedStudent.id) || null));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.requestPartnerAccess = async (req, res) => {
  try {
    const branchId = getEffectiveBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Please select a specific branch' });

    const student = await Student.findOne({
      where: { id: req.params.id, branch_id: branchId },
      include: [
        { model: User },
        { model: Batch, include: [{ model: Course, attributes: ['id', 'title', 'duration_weeks'] }] }
      ]
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    const studentData = {
      student_name: student.User?.name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'N/A',
      student_email: student.User?.email || 'N/A',
      student_phone: student.mobile_no || 'N/A',
      course_name: student.Batch?.Course?.title || 'N/A',
      batch_name: student.Batch?.code || student.Batch?.name || 'N/A',
      course_duration: student.Batch?.Course?.duration_weeks ? `${student.Batch.Course.duration_weeks} weeks` : 'N/A'
    };

    // Use the SMTP_USER as admin email for reply-to
    const adminEmail = process.env.SMTP_USER || 'admin@languageacademy.com.bd';

    const result = await sendPartnerAccessRequestEmail(studentData, adminEmail);

    if (result.success) {
      res.json({ message: 'Partner access request email sent successfully', details: result.message });
    } else {
      console.error('[Partner Access Email Failed]:', result.error);
      res.status(500).json({ error: 'Failed to send partner access request email', details: result.error });
    }
  } catch (error) {
    console.error('[RequestPartnerAccess Error]:', error.message);
    res.status(500).json({ error: error.message });
  }
};
