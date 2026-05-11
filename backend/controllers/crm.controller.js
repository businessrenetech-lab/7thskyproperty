const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const Opportunity = require('../models/Opportunity');
const Activity = require('../models/Activity');
const CampaignTemplate = require('../models/CampaignTemplate');
const Invoice = require('../models/Invoice');
const Account = require('../models/Account');
const JournalEntry = require('../models/JournalEntry');
const JournalLine = require('../models/JournalLine');
const User = require('../models/User');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Student = require('../models/Student');
const Enrollment = require('../models/Enrollment');
const sequelize = require('../config/db.config');
const { fn, col, literal, Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const automationService = require('../services/automation.service');
const communicationService = require('../services/communication.service');
const fbCapi = require('../services/facebookCapi.service');
const { createInvoiceWithGeneratedNo } = require('../utils/invoiceNumber');

const normalizeEducationDetails = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
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
  const normalized = normalizeCourseReason(value);
  if (normalized) return COUNTRY_REASON_VALUES.has(normalized) ? 'specific_country' : 'another_purpose';
  return ['specific_country', 'another_purpose'].includes(value) ? value : null;
};

const PTE_REASON_LABELS = {
  study_abroad: 'Study abroad',
  work: 'Work',
  migration_visa: 'Migration and visa applications',
  professional_registration: 'Professional registration',
  build_confidence: 'Build confidence in English',
  others: 'Others',
};

const COUNTRY_REASON_VALUES = new Set(['study_abroad', 'work', 'migration_visa']);

const normalizeCourseReason = (value) => {
  const normalized = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const aliases = {
    study_abroad: 'study_abroad',
    work: 'work',
    migration_visa: 'migration_visa',
    migration_and_visa_applications: 'migration_visa',
    professional_registration: 'professional_registration',
    build_confidence: 'build_confidence',
    build_confidence_in_english: 'build_confidence',
    others: 'others',
    other: 'others',
  };
  return aliases[normalized] || null;
};

const normalizeNullableText = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const derivePostCourseGoalType = (courseReason, country, fallback) => {
  if (courseReason) return COUNTRY_REASON_VALUES.has(courseReason) && country ? 'specific_country' : 'another_purpose';
  return normalizePostCourseGoalType(fallback);
};

const parseLeadTags = (lead) => {
  if (!lead?.tags) return {};
  if (typeof lead.tags === 'object') return lead.tags;
  try {
    return JSON.parse(lead.tags);
  } catch {
    return {};
  }
};

const getLeadStudentDetails = (lead) => parseLeadTags(lead).student_details || {};

const normalizeEnglishLevel = (value) => {
  return ['beginner', 'intermediate', 'expert'].includes(value) ? value : null;
};

const normalizeLeadSource = (value) => {
  const normalized = String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const map = {
    walk_in: 'walk_in',
    walkin: 'walk_in',
    walk: 'walk_in',
    website_enquiry: 'website',
    website: 'website',
    facebook: 'facebook',
    fb: 'facebook',
    instagram: 'instagram',
    google: 'google',
    referral: 'referral',
    newspaper: 'newspaper',
    event: 'event',
  };
  return map[normalized] || 'other';
};

// ============================================================
//  COURSES (for CRM course picker)
// ============================================================

exports.getCourses = async (req, res) => {
  try {
    const where = { status: 'active' };
    if (req.branchId) where.branch_id = req.branchId;

    const courses = await Course.findAll({
      where,
      attributes: ['id', 'title', 'base_fee', 'category', 'level', 'duration_weeks'],
      include: [{
        model: Batch,
        required: false,
        attributes: ['id', 'name', 'code', 'start_date', 'capacity', 'status']
      }],
      order: [['title', 'ASC']]
    });
    res.json(courses);
  } catch (error) {
    console.error('[CRM] getCourses Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
//  LEADS
// ============================================================

exports.getAllLeads = async (req, res) => {
  try {
    const { status, priority, source } = req.query;
    const where = { branch_id: req.branchId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (source) where.source = source;

    const leads = await Lead.findAll({
      where,
      include: [
        { model: User, as: 'Counselor', attributes: ['id', 'name', 'email'] },
      ],
      order: [['created_at', 'DESC']]
    });

    // Attach course info for leads that have a course_id
    const courseIds = [...new Set(leads.filter(l => l.course_id).map(l => l.course_id))];
    let coursesMap = {};
    if (courseIds.length > 0) {
      const courses = await Course.findAll({ where: { id: courseIds }, attributes: ['id', 'title', 'base_fee', 'category'] });
      courses.forEach(c => { coursesMap[c.id] = c; });
    }

    const result = leads.map(l => {
      const j = l.toJSON();
      if (j.course_id && coursesMap[j.course_id]) {
        j.Course = coursesMap[j.course_id];
      }
      return j;
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createLead = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, phone, email, source, batch_interest, notes, counselor_id, priority, expected_close, course_id, date_of_birth } = req.body;

    // Auto-fill deal_value from course base_fee if course is selected
    let deal_value = req.body.deal_value || 0;
    let courseTitle = batch_interest || '';
    if (course_id) {
      const course = await Course.findByPk(course_id, { attributes: ['title', 'base_fee'], transaction: t });
      if (course) {
        deal_value = course.base_fee;
        courseTitle = course.title;
      }
    }

    const lead = await Lead.create({
      branch_id: req.branchId,
      name, phone, email, source,
      date_of_birth: date_of_birth || null,
      batch_interest: courseTitle || batch_interest,
      notes, counselor_id, course_id,
      deal_value,
      priority: priority || 'medium',
      expected_close: expected_close || null,
      score: calculateLeadScore({ source, phone, email, batch_interest: courseTitle }),
    }, { transaction: t });

    let contact = null;
    if (email) {
      contact = await Contact.findOne({ where: { email, branch_id: req.branchId }, transaction: t });
    }
    if (!contact) {
      contact = await Contact.create({
        branch_id: req.branchId,
        name, phone, email, source, notes,
      }, { transaction: t });
    }

    await Opportunity.create({
      branch_id: req.branchId,
      title: `${lead.name} – ${courseTitle || 'Initial Inquiry'}`,
      contact_id: contact.id, lead_id: lead.id,
      value: deal_value || 0,
      stage: 'qualification',
      course_interest: courseTitle || batch_interest,
      assigned_to: counselor_id || (req.user ? req.user.id : null),
      expected_close: expected_close || null,
    }, { transaction: t });

    await t.commit();
    res.status(201).json(lead);

    automationService.processTrigger('new_lead', {
      name: lead.name, phone: lead.phone,
      batch_interest: lead.batch_interest, branch_id: req.branchId
    }).catch(() => {});

    // Fire Facebook CAPI 'Lead' event (non-blocking)
    fbCapi.sendLeadEvent(req, {
      name: lead.name, email: lead.email, phone: lead.phone,
      courseName: courseTitle || 'General Enquiry',
      value: deal_value,
    }).catch(() => {});
  } catch (error) {
    if (t) await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

exports.updateLead = async (req, res) => {
  try {
    const lead = await Lead.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // If course_id changed, auto-update deal_value
    if (req.body.course_id && req.body.course_id !== lead.course_id) {
      const course = await Course.findByPk(req.body.course_id, { attributes: ['title', 'base_fee'] });
      if (course) {
        req.body.deal_value = course.base_fee;
        req.body.batch_interest = course.title;
      }
    }

    await lead.update({ ...req.body, last_activity_at: new Date() });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateLeadStatus = async (req, res) => {
  try {
    const { status, notes, lost_reason } = req.body;
    const lead = await Lead.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found or access denied' });

    lead.status = status;
    if (notes) lead.notes = notes;
    if (lost_reason) lead.lost_reason = lost_reason;
    lead.last_activity_at = new Date();
    await lead.save();
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteLead = async (req, res) => {
  try {
    const deleted = await Lead.destroy({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!deleted) return res.status(404).json({ error: 'Lead not found or access denied' });
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────────────────
//  ENROLL LEAD → creates Enrollment + Invoice (NO student yet)
//  Student is created ONLY when POS collects the fee
// ────────────────────────────────────────────────────────────
exports.enrollLead = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const lead = await Lead.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!lead) {
      await t.rollback();
      return res.status(404).json({ error: 'Lead not found' });
    }

    const {
      batch_id,
      name,
      email,
      password,
      first_name,
      middle_name,
      last_name,
      father_name,
      mother_name,
      mobile_no,
      nid_birth_cert,
      date_of_birth,
      current_address,
      permanent_address,
      passport_no,
      photograph_url,
      educational_details,
      employment_details,
      profession,
      course_reason,
      preferred_country,
      other_reason,
      post_course_goal_type,
      target_country,
      english_level,
      referred_by,
      referral_amount
    } = req.body;
    const courseId = lead.course_id || req.body.course_id;
    if (!courseId) return res.status(400).json({ error: 'No course selected. Please select a course first.' });

    const course = await Course.findByPk(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const batchWhere = { id: batch_id, branch_id: req.branchId };

    // Find batch
    let batch = null;
    if (batch_id) {
      batch = await Batch.findOne({ where: batchWhere, transaction: t });
      if (!batch) return res.status(400).json({ error: 'Invalid batch selected for this branch.' });
    } else {
      batch = await Batch.findOne({
        where: { branch_id: req.branchId, course_id: courseId, status: { [Op.in]: ['enrolling', 'starting_soon'] } },
        order: [['start_date', 'ASC']]
      });
    }

    const fullName = (name || `${first_name || lead.name?.split(' ')[0] || ''} ${last_name || lead.name?.split(' ').slice(1).join(' ') || ''}`.trim() || lead.name).trim();
    const primaryEmail = (email || lead.email || '').trim();
    const userEmail = primaryEmail || `lead-${lead.id}@languageacademy.local`;
    const bookingDetails = getLeadStudentDetails(lead);
    const normalizedCourseReason = normalizeCourseReason(course_reason ?? bookingDetails.course_reason);
    const normalizedPreferredCountry = normalizeNullableText(
      preferred_country ?? target_country ?? bookingDetails.preferred_country ?? bookingDetails.target_country ?? lead.destination_country
    );
    const normalizedOtherReason = normalizedCourseReason === 'others' ? normalizeNullableText(other_reason ?? bookingDetails.other_reason) : null;
    const normalizedGoalType = derivePostCourseGoalType(normalizedCourseReason, normalizedPreferredCountry, post_course_goal_type ?? bookingDetails.post_course_goal_type);
    const normalizedTargetCountry = normalizedGoalType === 'specific_country' ? normalizedPreferredCountry : null;
    const normalizedEnglishLevel = normalizeEnglishLevel(english_level ?? bookingDetails.english_level);
    const studentLeadSource = normalizeLeadSource(lead.source);

    let user = await User.findOne({ where: { email: userEmail }, transaction: t });
    if (!user && primaryEmail && primaryEmail !== userEmail) {
      user = await User.findOne({ where: { email: primaryEmail }, transaction: t });
    }

    let generatedPassword = null;
    if (!user) {
      generatedPassword = password ? null : require('crypto').randomBytes(12).toString('base64url');
      const rawPassword = password || generatedPassword;
      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      user = await User.create({
        name: fullName,
        email: userEmail,
        password: hashedPassword,
        role: 'student',
        branch_id: req.branchId,
      }, { transaction: t });
    } else {
      await user.update({
        name: fullName,
        branch_id: req.branchId,
      }, { transaction: t });
    }

    let student = await Student.findOne({ where: { user_id: user.id, branch_id: req.branchId }, transaction: t });
    if (!student) {
      student = await Student.create({
        user_id: user.id,
        branch_id: req.branchId,
        batch_id: batch?.id || null,
        first_name: first_name || fullName.split(' ')[0] || lead.name.split(' ')[0],
        middle_name: middle_name || null,
        last_name: last_name || fullName.split(' ').slice(1).join(' ') || '',
        father_name: father_name || null,
        mother_name: mother_name || null,
        mobile_no: mobile_no || lead.phone || null,
        nid_birth_cert: nid_birth_cert || null,
        date_of_birth: date_of_birth || lead.date_of_birth || null,
        current_address: current_address || null,
        permanent_address: permanent_address || null,
        passport_no: passport_no || null,
        photograph_url: photograph_url || null,
        educational_details: normalizeEducationDetails(educational_details),
        employment_details: normalizeEmploymentDetails(employment_details),
        profession: profession || null,
        lead_source: studentLeadSource,
        post_course_goal_type: normalizedGoalType,
        target_country: normalizedTargetCountry,
        english_level: normalizedEnglishLevel,
        referred_by: referred_by || lead.referred_by || null,
        referral_amount: Number(referral_amount) || Number(lead.referral_amount) || 0,
        enrollment_date: new Date(),
        status: 'active',
      }, { transaction: t });
    } else {
      await student.update({
        batch_id: batch?.id || student.batch_id,
        first_name: first_name || student.first_name || fullName.split(' ')[0],
        middle_name: middle_name !== undefined ? middle_name : student.middle_name,
        last_name: last_name || student.last_name || fullName.split(' ').slice(1).join(' '),
        father_name: father_name !== undefined ? father_name : student.father_name,
        mother_name: mother_name !== undefined ? mother_name : student.mother_name,
        mobile_no: mobile_no || student.mobile_no || lead.phone,
        nid_birth_cert: nid_birth_cert !== undefined ? nid_birth_cert : student.nid_birth_cert,
        date_of_birth: date_of_birth !== undefined ? date_of_birth : (student.date_of_birth || lead.date_of_birth),
        current_address: current_address !== undefined ? current_address : student.current_address,
        permanent_address: permanent_address !== undefined ? permanent_address : student.permanent_address,
        passport_no: passport_no !== undefined ? passport_no : student.passport_no,
        photograph_url: photograph_url !== undefined ? photograph_url : student.photograph_url,
        educational_details: educational_details !== undefined ? normalizeEducationDetails(educational_details) : student.educational_details,
        employment_details: employment_details !== undefined ? normalizeEmploymentDetails(employment_details) : student.employment_details,
        profession: profession !== undefined ? profession : student.profession,
        lead_source: student.lead_source || studentLeadSource,
        post_course_goal_type: post_course_goal_type !== undefined ? normalizedGoalType : student.post_course_goal_type,
        target_country: target_country !== undefined ? normalizedTargetCountry : student.target_country,
        english_level: english_level !== undefined ? normalizedEnglishLevel : student.english_level,
        referred_by: referred_by !== undefined ? referred_by : (student.referred_by || lead.referred_by),
        referral_amount: referral_amount !== undefined ? Number(referral_amount) : (student.referral_amount || lead.referral_amount),
        enrollment_date: student.enrollment_date || new Date(),
        status: student.status || 'active',
      }, { transaction: t });
    }

    const mergedTags = {
      ...parseLeadTags(lead),
      student_details: {
        ...bookingDetails,
        first_name: first_name || bookingDetails.first_name || fullName.split(' ')[0] || '',
        middle_name: middle_name !== undefined ? middle_name : bookingDetails.middle_name,
        last_name: last_name || bookingDetails.last_name || fullName.split(' ').slice(1).join(' ') || '',
        mobile_no: mobile_no || bookingDetails.mobile_no || lead.phone || '',
        email: primaryEmail || bookingDetails.email || '',
        date_of_birth: date_of_birth !== undefined ? date_of_birth : (bookingDetails.date_of_birth || lead.date_of_birth || null),
        course_reason: normalizedCourseReason || '',
        course_reason_label: normalizedCourseReason ? PTE_REASON_LABELS[normalizedCourseReason] : '',
        preferred_country: normalizedPreferredCountry || '',
        other_reason: normalizedOtherReason || '',
        post_course_goal_type: normalizedGoalType || '',
        target_country: normalizedTargetCountry || '',
        english_level: normalizedEnglishLevel || '',
      }
    };

    await lead.update({
      tags: mergedTags,
      destination_country: normalizedTargetCountry || lead.destination_country,
      referred_by: referred_by !== undefined ? referred_by : lead.referred_by,
      referral_amount: referral_amount !== undefined ? Number(referral_amount) : lead.referral_amount,
    }, { transaction: t });

    // 1. Create enrollment with linked student profile
    const enrollment = await Enrollment.create({
      branch_id: req.branchId,
      student_id: student.id,
      batch_id: batch?.id || null,
      total_fee: course.base_fee,
      discount: 0,
      paid_amount: 0,
      status: 'pending',
    }, { transaction: t });

    if (batch?.id) {
      await Batch.increment('enrolled', { by: 1, where: { id: batch.id }, transaction: t });
    }

    // 2. Create pending invoice linked to enrollment
    const invoice = await createInvoiceWithGeneratedNo({
      branch_id: req.branchId,
      enrollment_id: enrollment.id,
      student_id: student.id,
      amount: course.base_fee,
      paid: 0,
      status: 'pending',
      due_date: new Date(Date.now() + 14 * 86400000),
      notes: `CRM Lead ID: ${lead.id} | CRM Lead: ${lead.name} — ${course.title}. Pending fee collection via POS.`,
    }, { transaction: t }, { prefix: 'CRM-INV' });

    // 3. Create contact
    let contact = null;
    if (lead.email) {
      contact = await Contact.findOne({ where: { email: lead.email, branch_id: req.branchId } });
    }
    if (!contact) {
      contact = await Contact.create({
        branch_id: req.branchId,
        name: lead.name, phone: lead.phone, email: lead.email,
        source: lead.source, notes: lead.notes,
      }, { transaction: t });
    }

    // 4. Create opportunity
    const opportunity = await Opportunity.create({
      branch_id: req.branchId,
      title: `${lead.name} – ${course.title}`,
      contact_id: contact.id, lead_id: lead.id,
      value: course.base_fee,
      stage: 'negotiation',
      course_interest: course.title,
      assigned_to: lead.counselor_id || req.user.id,
      expected_close: lead.expected_close,
      description: `Enrollment ID: ${enrollment.id}`,
    }, { transaction: t });

    // 5. Move lead to fees_pending (not successful yet — POS decides that)
    await lead.update({
      status: 'fees_pending',
      deal_value: course.base_fee,
      email: primaryEmail || lead.email,
      phone: mobile_no || lead.phone,
      last_activity_at: new Date(),
    }, { transaction: t });

    await invoice.update({
      notes: `${invoice.notes} | Opportunity ID: ${opportunity.id}`
    }, { transaction: t });

    await t.commit();

    res.status(201).json({
      message: `Student, enrollment, and invoice created for ${course.title}. Invoice ${invoice.invoice_no} is ready for POS collection.`,
      student, enrollment, invoice, opportunity, contact,
      temporary_password: generatedPassword,
    });

    // Fire Facebook CAPI 'CompleteRegistration' event (non-blocking)
    fbCapi.sendRegistrationEvent(req, {
      name: fullName, email: primaryEmail, phone: mobile_no || lead.phone,
      courseName: course.title, value: course.base_fee,
    }).catch(() => {});
  } catch (error) {
    await t.rollback();
    console.error('[CRM] Enroll Lead Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Mark lead as successful (after fees collected by accounting)
exports.markSuccessful = async (req, res) => {
  const t = await sequelize.transaction();
  let purchaseEventPayload = null;
  try {
    const lead = await Lead.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!lead) {
      await t.rollback();
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Mark lead successful
    await lead.update({ status: 'successful', last_activity_at: new Date() }, { transaction: t });

    // Mark any associated opportunity as won
    const opp = await Opportunity.findOne({ where: { lead_id: lead.id, branch_id: req.branchId } });
    if (opp && opp.stage !== 'won') {
      // Create invoice
      const invoice = await createInvoiceWithGeneratedNo({
        branch_id: req.branchId,
        amount: opp.value, paid: opp.value,
        status: 'paid',
        due_date: new Date(),
        notes: `CRM Deal: ${opp.title} (fees collected)`,
      }, { transaction: t }, { prefix: 'CRM-INV' });

      const course = lead.course_id
        ? await Course.findByPk(lead.course_id, { attributes: ['id', 'title'], transaction: t })
        : null;

      purchaseEventPayload = {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        courseName: course?.title || opp.course_interest || lead.batch_interest || 'CRM Sale',
        courseId: course?.id || lead.course_id,
        value: opp.value || lead.deal_value || 0,
        orderId: invoice.invoice_no || invoice.id,
        paymentMethod: 'crm',
        branchId: req.branchId,
        externalId: lead.id,
      };

      // Journal entry
      let arAccount = await Account.findOne({ where: { name: 'Accounts Receivable', branch_id: req.branchId } });
      let revenueAccount = await Account.findOne({ where: { type: 'revenue', branch_id: req.branchId } });
      if (arAccount && revenueAccount) {
        const entry = await JournalEntry.create({
          branch_id: req.branchId,
          ref_no: `CRM-WIN-${opp.id}-${Date.now()}`,
          description: `CRM Sale: ${opp.title}`,
          date: new Date(), posted_by: req.user.id,
        }, { transaction: t });
        await JournalLine.bulkCreate([
          { journal_entry_id: entry.id, account_id: arAccount.id, debit: opp.value, credit: 0, notes: opp.title },
          { journal_entry_id: entry.id, account_id: revenueAccount.id, debit: 0, credit: opp.value, notes: `CRM revenue: ${opp.title}` },
        ], { transaction: t });
      }

      await opp.update({ stage: 'won', closed_at: new Date(), invoice_id: invoice.id, probability: 100 }, { transaction: t });
    }

    await t.commit();
    res.json({ message: 'Sale marked successful! Revenue recorded.' });

    if (purchaseEventPayload) {
      fbCapi.sendPurchaseEvent(req, purchaseEventPayload).catch(() => {});
    }
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

// Convert lead → contact + opportunity (no enrollment yet)
exports.convertLead = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const lead = await Lead.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const contact = await Contact.create({
      branch_id: req.branchId,
      name: lead.name, phone: lead.phone, email: lead.email,
      source: lead.source, notes: lead.notes,
    }, { transaction: t });

    const opportunity = await Opportunity.create({
      branch_id: req.branchId,
      title: `${lead.name} – ${lead.batch_interest || 'Enrollment'}`,
      contact_id: contact.id, lead_id: lead.id,
      value: lead.deal_value || 0,
      stage: 'qualification',
      course_interest: lead.batch_interest,
      assigned_to: lead.counselor_id || req.user.id,
      expected_close: lead.expected_close,
    }, { transaction: t });

    await lead.update({ status: 'enrolled', last_activity_at: new Date() }, { transaction: t });
    await t.commit();
    res.status(201).json({ contact, opportunity, message: 'Lead converted successfully' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
//  CONTACTS
// ============================================================

exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.findAll({
      where: { branch_id: req.branchId, is_active: true },
      order: [['created_at', 'DESC']]
    });

    const contactIds = contacts.map((contact) => contact.id);
    let contactLeadMap = new Map();

    if (contactIds.length > 0) {
      const opportunities = await Opportunity.findAll({
        where: { branch_id: req.branchId, contact_id: { [Op.in]: contactIds } },
        attributes: ['id', 'contact_id', 'lead_id', 'created_at'],
        order: [['created_at', 'DESC']]
      });

      const leadIds = [...new Set(opportunities.map((opportunity) => opportunity.lead_id).filter(Boolean))];
      const leads = leadIds.length > 0
        ? await Lead.findAll({
          where: { branch_id: req.branchId, id: { [Op.in]: leadIds } },
          attributes: ['id', 'status', 'source', 'course_id', 'batch_interest', 'updated_at']
        })
        : [];

      const leadMap = new Map(leads.map((lead) => [lead.id, lead]));
      opportunities.forEach((opportunity) => {
        if (!contactLeadMap.has(opportunity.contact_id) && leadMap.has(opportunity.lead_id)) {
          const lead = leadMap.get(opportunity.lead_id);
          contactLeadMap.set(opportunity.contact_id, {
            id: lead.id,
            status: lead.status,
            source: lead.source,
            course_id: lead.course_id,
            batch_interest: lead.batch_interest,
            updated_at: lead.updated_at
          });
        }
      });
    }

    res.json(contacts.map((contact) => ({
      ...contact.toJSON(),
      CurrentLead: contactLeadMap.get(contact.id) || null
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createContact = async (req, res) => {
  try {
    const contact = await Contact.create({ ...req.body, branch_id: req.branchId });
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getContact = async (req, res) => {
  try {
    const contact = await Contact.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    const [activities, opportunities] = await Promise.all([
      Activity.findAll({ where: { contact_id: contact.id }, order: [['created_at', 'DESC']], limit: 20 }),
      Opportunity.findAll({ where: { contact_id: contact.id }, order: [['created_at', 'DESC']] }),
    ]);
    res.json({ ...contact.toJSON(), activities, opportunities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateContact = async (req, res) => {
  try {
    const contact = await Contact.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    await contact.update(req.body);
    res.json(contact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    await contact.update({ is_active: false });
    res.json({ message: 'Contact deactivated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.bulkUpdateContactLeadStatus = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { contactIds, status } = req.body;
    if (!contactIds || !contactIds.length || !status) {
      return res.status(400).json({ error: 'Missing contactIds or status' });
    }

    const opportunities = await Opportunity.findAll({
      where: { branch_id: req.branchId, contact_id: { [Op.in]: contactIds } },
      attributes: ['lead_id'],
      transaction: t
    });

    const leadIds = [...new Set(opportunities.map(o => o.lead_id).filter(Boolean))];

    if (leadIds.length > 0) {
      await Lead.update(
        { status, last_activity_at: new Date() },
        { where: { branch_id: req.branchId, id: { [Op.in]: leadIds } }, transaction: t }
      );
    }

    await t.commit();
    res.json({ message: `Successfully updated ${leadIds.length} leads` });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

exports.bulkUploadContacts = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { contacts } = req.body;
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'No valid contacts provided' });
    }

    let successCount = 0;
    for (const item of contacts) {
      const { name, phone, email, source, notes } = item;
      if (!name) continue; // Skip rows without name

      // 1. Create Lead
      const lead = await Lead.create({
        branch_id: req.branchId,
        name, phone, email, source: source || 'Imported', notes,
        priority: 'medium',
        score: calculateLeadScore({ source: source || 'Imported', phone, email })
      }, { transaction: t });

      // 2. Create or Find Contact
      let contact = null;
      if (email) {
        contact = await Contact.findOne({ where: { email, branch_id: req.branchId }, transaction: t });
      }
      if (!contact && phone) {
        contact = await Contact.findOne({ where: { phone, branch_id: req.branchId }, transaction: t });
      }
      if (!contact) {
        contact = await Contact.create({
          branch_id: req.branchId, name, phone, email, source: source || 'Imported', notes
        }, { transaction: t });
      }

      // 3. Create Opportunity
      await Opportunity.create({
        branch_id: req.branchId,
        title: `${lead.name} – Imported`,
        contact_id: contact.id, lead_id: lead.id,
        value: 0,
        stage: 'qualification',
        assigned_to: req.user ? req.user.id : null,
      }, { transaction: t });

      successCount++;
    }

    await t.commit();
    res.json({ message: `Successfully imported ${successCount} contacts.` });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};


// ============================================================
//  OPPORTUNITIES (Deals)
// ============================================================

exports.getOpportunities = async (req, res) => {
  try {
    const where = { branch_id: req.branchId };
    if (req.query.stage) where.stage = req.query.stage;
    const opportunities = await Opportunity.findAll({
      where,
      include: [{ model: User, as: 'AssignedTo', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']]
    });
    res.json(opportunities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createOpportunity = async (req, res) => {
  try {
    const opp = await Opportunity.create({ ...req.body, branch_id: req.branchId });
    res.status(201).json(opp);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateOpportunity = async (req, res) => {
  try {
    const opp = await Opportunity.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });
    await opp.update(req.body);
    res.json(opp);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteOpportunity = async (req, res) => {
  try {
    await Opportunity.destroy({ where: { id: req.params.id, branch_id: req.branchId } });
    res.json({ message: 'Opportunity deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.winOpportunity = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const opp = await Opportunity.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });
    if (opp.stage === 'won') return res.status(400).json({ error: 'Already marked as won' });

    const invoice = await createInvoiceWithGeneratedNo({
      branch_id: req.branchId,
      amount: opp.value, paid: 0, status: 'pending',
      due_date: new Date(Date.now() + 7 * 86400000),
      notes: `CRM Deal: ${opp.title}`,
    }, { transaction: t }, { prefix: 'CRM-INV' });

    let arAccount = await Account.findOne({ where: { name: 'Accounts Receivable', branch_id: req.branchId } });
    let revenueAccount = await Account.findOne({ where: { type: 'revenue', branch_id: req.branchId } });
    if (arAccount && revenueAccount) {
      const entry = await JournalEntry.create({
        branch_id: req.branchId, ref_no: `CRM-WIN-${opp.id}-${Date.now()}`,
        description: `CRM Deal Won: ${opp.title}`, date: new Date(), posted_by: req.user.id,
      }, { transaction: t });
      await JournalLine.bulkCreate([
        { journal_entry_id: entry.id, account_id: arAccount.id, debit: opp.value, credit: 0, notes: opp.title },
        { journal_entry_id: entry.id, account_id: revenueAccount.id, debit: 0, credit: opp.value, notes: `Revenue: ${opp.title}` },
      ], { transaction: t });
    }

    await opp.update({ stage: 'won', closed_at: new Date(), invoice_id: invoice.id, probability: 100 }, { transaction: t });
    await t.commit();
    res.json({ message: 'Opportunity won! Invoice created.', opportunity: opp, invoice });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

exports.loseOpportunity = async (req, res) => {
  try {
    const opp = await Opportunity.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });
    await opp.update({ stage: 'lost', closed_at: new Date(), lost_reason: req.body.lost_reason || '', probability: 0 });
    res.json(opp);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
//  ACTIVITIES
// ============================================================

exports.getActivities = async (req, res) => {
  try {
    const where = { branch_id: req.branchId };
    if (req.query.lead_id) where.lead_id = req.query.lead_id;
    if (req.query.contact_id) where.contact_id = req.query.contact_id;
    if (req.query.opportunity_id) where.opportunity_id = req.query.opportunity_id;
    if (req.query.type) where.type = req.query.type;
    if (req.query.overdue === 'true') {
      where.is_done = false;
      where.due_date = { [Op.lt]: new Date() };
    }
    const activities = await Activity.findAll({
      where,
      include: [{ model: User, as: 'Creator', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(req.query.limit) || 50,
    });
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createActivity = async (req, res) => {
  try {
    const activity = await Activity.create({
      ...req.body, branch_id: req.branchId, created_by: req.user.id,
    });
    if (req.body.lead_id) {
      await Lead.update({ last_activity_at: new Date() }, { where: { id: req.body.lead_id } });
    }
    res.status(201).json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.completeActivity = async (req, res) => {
  try {
    const activity = await Activity.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    await activity.update({ is_done: true, completed_at: new Date(), outcome: req.body.outcome || '' });
    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
//  CAMPAIGNS
// ============================================================

exports.getCampaigns = async (req, res) => {
  try {
    const campaigns = await CampaignTemplate.findAll({
      where: { branch_id: req.branchId },
      include: [{ model: User, as: 'Creator', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']]
    });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createCampaign = async (req, res) => {
  try {
    const campaign = await CampaignTemplate.create({
      ...req.body, branch_id: req.branchId, created_by: req.user.id,
    });
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.sendCampaign = async (req, res) => {
  try {
    const campaign = await CampaignTemplate.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status === 'sent') return res.status(400).json({ error: 'Already sent' });

    const statusMap = { all_leads: null, new_leads: 'new', interested: 'interested', trial: 'trial', lost: 'lost' };
    const leadWhere = { branch_id: req.branchId };
    if (statusMap[campaign.target_audience]) leadWhere.status = statusMap[campaign.target_audience];

    let recipients = [];
    if (campaign.target_audience.includes('contact')) {
      recipients = await Contact.findAll({ where: { branch_id: req.branchId, is_active: true } });
    } else {
      recipients = await Lead.findAll({ where: leadWhere });
    }

    const recipientCount = recipients.length;

    await campaign.update({ status: 'sent', sent_at: new Date(), sent_count: recipientCount });
    
    // Process the dispatch asynchronously to not block the response
    communicationService.processCampaignBatch(campaign, recipients).catch(err => {
      console.error('[CRM_CONTROLLER] Error processing campaign batch async:', err);
    });

    res.json({ message: `Campaign sending initiated for ${recipientCount} recipients in the background.`, campaign });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    await CampaignTemplate.destroy({ where: { id: req.params.id, branch_id: req.branchId } });
    res.json({ message: 'Campaign deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
//  ANALYTICS
// ============================================================

exports.getFunnel = async (req, res) => {
  try {
    const branchId = req.branchId;
    const stages = ['new', 'contacted', 'interested', 'trial', 'enrolled', 'fees_pending', 'payment_rejected', 'successful', 'lost'];
    const counts = await Promise.all(
      stages.map(s => Lead.count({ where: { branch_id: branchId, status: s } }))
    );
    const totalActive = counts.slice(0, -1).reduce((s, c) => s + c, 0);
    const funnel = stages.map((stage, i) => ({
      stage,
      count: counts[i],
      conversionRate: totalActive > 0 ? ((counts[i] / totalActive) * 100).toFixed(1) : 0
    }));
    const successCount = counts[7]; // successful
    const paymentRejectedCount = counts[6];
    const overallConversion = totalActive > 0 ? ((successCount / totalActive) * 100).toFixed(1) : 0;

    // Revenue = only from "successful" leads' deal_value
    const successfulRevenue = await Lead.sum('deal_value', {
      where: { branch_id: branchId, status: 'successful' }
    }) || 0;

    const rejectedRevenue = await Lead.sum('deal_value', {
      where: { branch_id: branchId, status: 'payment_rejected' }
    }) || 0;

    res.json({ funnel, overallConversion, successfulRevenue, paymentRejectedCount, rejectedRevenue });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSourceAnalysis = async (req, res) => {
  try {
    const sources = await Lead.findAll({
      where: { branch_id: req.branchId },
      attributes: [
        'source',
        [fn('COUNT', col('id')), 'total'],
        [fn('SUM', literal("CASE WHEN status='successful' THEN 1 ELSE 0 END")), 'converted'],
        [fn('SUM', literal("CASE WHEN status='payment_rejected' THEN 1 ELSE 0 END")), 'payment_rejected'],
        [fn('SUM', literal("CASE WHEN status='successful' THEN deal_value ELSE 0 END")), 'revenue'],
      ],
      group: ['source'],
      order: [[literal('total'), 'DESC']]
    });
    res.json(sources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRevenueForecast = async (req, res) => {
  try {
    const opportunities = await Opportunity.findAll({
      where: { branch_id: req.branchId, stage: { [Op.notIn]: ['won', 'lost'] } },
      attributes: ['stage', 'value', 'probability', 'expected_close']
    });
    const totalPipelineValue = opportunities.reduce((s, o) => s + parseFloat(o.value || 0), 0);
    const weightedForecast = opportunities.reduce((s, o) => s + (parseFloat(o.value || 0) * (o.probability / 100)), 0);

    // Successful revenue (real)
    const realRevenue = await Lead.sum('deal_value', {
      where: { branch_id: req.branchId, status: 'successful' }
    }) || 0;

    const byStage = ['qualification', 'proposal', 'demo', 'negotiation'].map(stage => {
      const stageOpps = opportunities.filter(o => o.stage === stage);
      return {
        stage, count: stageOpps.length,
        value: stageOpps.reduce((s, o) => s + parseFloat(o.value || 0), 0),
      };
    });
    res.json({ totalPipelineValue, weightedForecast, realRevenue, byStage });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSuccessResultsAnalysis = async (req, res) => {
  try {
    const rows = await Student.findAll({
      where: {
        branch_id: req.branchId,
        final_course_result: { [Op.not]: null }
      },
      attributes: [
        'final_course_result',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['final_course_result'],
      order: [[literal('count'), 'DESC']]
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSuccessDestinationAnalysis = async (req, res) => {
  try {
    const rows = await Student.findAll({
      where: {
        branch_id: req.branchId,
        success_destination_country: { [Op.not]: null }
      },
      attributes: [
        'success_destination_country',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['success_destination_country'],
      order: [[literal('count'), 'DESC']]
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
//  HELPERS
// ============================================================

function calculateLeadScore({ source, phone, email, batch_interest }) {
  let score = 20;
  if (phone) score += 20;
  if (email) score += 15;
  if (batch_interest) score += 15;
  const highValueSources = ['Referral', 'Walk-in', 'Website'];
  if (source && highValueSources.includes(source)) score += 30;
  else if (source) score += 10;
  return Math.min(score, 100);
}
