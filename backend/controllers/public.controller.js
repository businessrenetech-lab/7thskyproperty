const Course = require('../models/Course');
const BlogPost = require('../models/BlogPost');
const Batch = require('../models/Batch');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const Opportunity = require('../models/Opportunity');
const Branch = require('../models/Branch');
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const fbCapi = require('../services/facebookCapi.service');
const { getTableColumns, hasColumn, pickExisting, isTransientDbError } = require('../utils/schemaSafe');

const parseBranchId = (req) => {
  const raw = req.body?.branch_id || req.body?.branch || req.query?.branch_id || req.query?.branch;
  const branchId = parseInt(raw, 10);
  return Number.isInteger(branchId) && branchId > 0 ? branchId : null;
};

const normalizeEducationDetails = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
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
  if (typeof value === 'string') return value.trim() || null;
  return value;
};

const PTE_REASON_LABELS = {
  study_abroad: 'Study abroad',
  work: 'Work',
  migration_visa: 'Migration and visa applications',
  professional_registration: 'Professional registration',
  build_confidence: 'Build confidence in English',
  others: 'Others',
};

const PUBLIC_BRANCH_FIELDS = [
  'id', 'name', 'code', 'slug', 'type', 'address', 'phone', 'email', 'is_active',
  'public_title', 'public_description', 'seo_title', 'seo_description',
  'hero_image_url', 'opening_hours', 'map_url', 'coming_soon_message',
  'created_at', 'updated_at'
];

const PUBLIC_COURSE_FIELDS = [
  'id', 'branch_id', 'title', 'slug', 'category', 'level', 'base_fee', 'duration_weeks',
  'image_url', 'short_description', 'description', 'what_you_will_learn', 'modules',
  'instructor_name', 'updated_at'
];

const PUBLIC_BLOG_FIELDS = ['id', 'branch_id', 'title', 'slug', 'excerpt', 'image_url', 'published_at', 'updated_at'];

const PUBLIC_COURSE_FALLBACKS = [
  {
    id: 1,
    title: 'PTE Basic',
    slug: 'pte-basic',
    category: 'PTE',
    level: 'beginner',
    base_fee: 5500,
    duration_weeks: 2,
    short_description: '2 Weeks, 4 classes. Unlimited mock test included.',
    description: 'A focused PTE refresher for students who need fast format coverage and guided practice.',
  },
  {
    id: 2,
    title: 'PTE Core',
    slug: 'pte-core',
    category: 'PTE',
    level: 'intermediate',
    base_fee: 10500,
    duration_weeks: 4,
    short_description: '4 Weeks, 8 classes with unlimited mock test and class access.',
    description: 'Our standard PTE preparation track for strategy, templates, fluency, and regular mock practice.',
  },
  {
    id: 3,
    title: 'PTE Advanced',
    slug: 'pte-advanced',
    category: 'PTE',
    level: 'advanced',
    base_fee: 18000,
    duration_weeks: 8,
    short_description: '8 Weeks, 16 classes for students targeting a 79+ score.',
    description: 'Advanced PTE preparation with deeper practice across speaking, writing, reading, and listening.',
  },
  {
    id: 4,
    title: 'PTE Premium',
    slug: 'pte-premium',
    category: 'PTE',
    level: 'advanced',
    base_fee: 25000,
    duration_weeks: 12,
    short_description: '12 Weeks, 24 classes with complete mock and class access.',
    description: 'A complete PTE preparation package for students who need structured support from fundamentals to advanced scoring.',
  },
];

const isDatabaseUnavailableError = (error) => {
  const code = error?.original?.code || error?.parent?.code || error?.code;
  const message = error?.message || '';
  return isTransientDbError(error)
    || code === 'ER_USER_LIMIT_REACHED'
    || message.includes('max_connections_per_hour');
};

const getMainBranchId = async () => {
  const columns = await getTableColumns('branches');
  if (!columns) return 1;
  const headBranch = await Branch.findOne({
    where: hasColumn(columns, 'type') ? { type: 'head' } : { id: 1 },
    attributes: pickExisting(columns, ['id']),
    order: [['id', 'ASC']],
  });
  return headBranch?.id || 1;
};

const normalizeBranchPayload = (branch) => {
  const item = branch.toJSON ? branch.toJSON() : branch;
  return {
    ...item,
    slug: item.slug || String(item.id),
    public_title: item.public_title || `Language Academy ${item.name}`,
    public_description: item.public_description || item.address || '',
    seo_title: item.seo_title || `Language Academy ${item.name} - PTE, IELTS and English Courses`,
    seo_description: item.seo_description || `Visit Language Academy ${item.name} for PTE, IELTS and English language courses.`,
    opening_hours: item.opening_hours || 'Sat-Thu: 9:00 AM - 8:00 PM',
    coming_soon_message: item.coming_soon_message || 'Coming soon',
  };
};

const findPublicBranchBySlug = async (slug, { activeOnly = true } = {}) => {
  const columns = await getTableColumns('branches');
  if (!columns) return null;
  const isId = /^\d+$/.test(String(slug || ''));
  const orConditions = [];
  if (hasColumn(columns, 'slug')) orConditions.push({ slug });
  if (isId) orConditions.push({ id: parseInt(slug, 10) });
  if (orConditions.length === 0) return null;

  const where = { [Op.or]: orConditions };
  if (activeOnly && hasColumn(columns, 'is_active')) where.is_active = true;

  const branch = await Branch.findOne({
    where,
    attributes: pickExisting(columns, PUBLIC_BRANCH_FIELDS),
  });

  return branch ? normalizeBranchPayload(branch) : null;
};

const buildPublishedCourseWhere = async (branchId, options = {}) => {
  const columns = await getTableColumns('courses');
  if (!columns) return null;
  const where = {};
  if (!options.includeUnpublished && hasColumn(columns, 'is_published')) where.is_published = true;
  if (hasColumn(columns, 'status')) where.status = 'active';
  if (branchId && hasColumn(columns, 'branch_id')) where.branch_id = branchId;
  return { columns, where };
};

const mapPublicCourse = (course) => {
  const item = course.toJSON ? course.toJSON() : course;
  return {
    ...item,
    slug: item.slug || String(item.id),
    category: item.category || 'PTE',
    level: item.level || 'beginner',
    base_fee: item.base_fee || 0,
    duration_weeks: item.duration_weeks || null,
    image_url: item.image_url || null,
    short_description: item.short_description || item.description || '',
  };
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

const derivePostCourseGoalType = (courseReason, country, fallback) => {
  if (courseReason) return COUNTRY_REASON_VALUES.has(courseReason) && country ? 'specific_country' : 'another_purpose';
  return ['specific_country', 'another_purpose'].includes(fallback) ? fallback : null;
};

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

exports.getPublishedCourses = async (req, res) => {
  try {
    const requestedBranchId = parseBranchId(req);
    const branchId = requestedBranchId || await getMainBranchId();
    const includeUnpublished = requestedBranchId && req.query?.booking === 'true';
    const courseFilter = await buildPublishedCourseWhere(branchId, { includeUnpublished });
    if (!courseFilter) return res.json(PUBLIC_COURSE_FALLBACKS);
    const { columns, where } = courseFilter;

    const branchColumns = await getTableColumns('branches');

    const courses = await Course.findAll({
      where,
      attributes: pickExisting(columns, PUBLIC_COURSE_FIELDS),
      include: branchColumns ? [{ model: Branch, attributes: pickExisting(branchColumns, ['id', 'name', 'slug']) }] : [],
      order: [['created_at', 'DESC']],
    });

    res.json(courses.map(mapPublicCourse));
  } catch (err) {
    console.error('Error fetching courses:', err);
    if (isDatabaseUnavailableError(err)) return res.json(PUBLIC_COURSE_FALLBACKS);
    res.status(500).json({ message: 'Error fetching courses' });
  }
};

exports.getCourseDetails = async (req, res) => {
  try {
    const { slug } = req.params;
    const branchId = parseBranchId(req) || await getMainBranchId();
    const isId = /^\d+$/.test(slug);
    const columns = await getTableColumns('courses');
    if (!columns) {
      const fallback = PUBLIC_COURSE_FALLBACKS.find((course) => course.slug === slug || String(course.id) === slug);
      return fallback ? res.json({ ...fallback, Batches: [] }) : res.status(404).json({ message: 'Course not found' });
    }

    const where = {};
    const orConditions = [];
    if (hasColumn(columns, 'slug')) orConditions.push({ slug });
    if (isId) orConditions.push({ id: parseInt(slug, 10) });
    if (orConditions.length === 0) return res.status(404).json({ message: 'Course not found' });
    where[Op.or] = orConditions;
    if (hasColumn(columns, 'is_published')) where.is_published = true;
    if (hasColumn(columns, 'status')) where.status = 'active';
    if (branchId && hasColumn(columns, 'branch_id')) where.branch_id = branchId;

    const batchColumns = await getTableColumns('batches');
    const batchWhere = {};
    if (hasColumn(batchColumns, 'status')) batchWhere.status = { [Op.in]: ['enrolling', 'starting_soon'] };
    const batchAttributes = pickExisting(batchColumns, ['id', 'name', 'start_date', 'schedule', 'capacity', 'enrolled']);
    
    const course = await Course.findOne({
      where,
      include: batchColumns ? [
        {
          model: Batch,
          where: batchWhere,
          required: false,
          attributes: batchAttributes
        }
      ] : [],
      attributes: pickExisting(columns, PUBLIC_COURSE_FIELDS.concat(['instructor_bio']))
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(mapPublicCourse(course));
  } catch (err) {
    console.error('Error fetching course details:', err);
    if (isDatabaseUnavailableError(err)) {
      const fallback = PUBLIC_COURSE_FALLBACKS.find((course) => course.slug === req.params.slug || String(course.id) === String(req.params.slug));
      if (fallback) return res.json({ ...fallback, Batches: [] });
    }
    res.status(500).json({ message: 'Error fetching course details' });
  }
};

exports.getPublishedBlogs = async (req, res) => {
  try {
    const requestedBranchId = parseBranchId(req);
    const branchId = requestedBranchId || await getMainBranchId();
    const columns = await getTableColumns('blog_posts');
    if (!columns) return res.json([]);
    const where = {};
    if (hasColumn(columns, 'is_published')) where.is_published = true;
    if (branchId && hasColumn(columns, 'branch_id')) where.branch_id = branchId;
    const blogs = await BlogPost.findAll({
      where,
      order: hasColumn(columns, 'published_at') ? [['published_at', 'DESC']] : [['id', 'DESC']],
      attributes: pickExisting(columns, PUBLIC_BLOG_FIELDS)
    });
    res.json(blogs);
  } catch (err) {
    console.error('Error fetching blogs:', err);
    if (isDatabaseUnavailableError(err)) return res.json([]);
    res.status(500).json({ message: 'Error fetching blogs' });
  }
};

exports.getBlogDetails = async (req, res) => {
  try {
    const { slug } = req.params;
    const branchId = parseBranchId(req) || await getMainBranchId();
    const columns = await getTableColumns('blog_posts');
    if (!columns) return res.status(404).json({ message: 'Blog post not found' });
    const where = { slug };
    if (hasColumn(columns, 'is_published')) where.is_published = true;
    if (branchId && hasColumn(columns, 'branch_id')) where.branch_id = branchId;
    const blog = await BlogPost.findOne({
      where,
      attributes: pickExisting(columns, PUBLIC_BLOG_FIELDS.concat(['content']))
    });

    if (!blog) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    res.json(blog);
  } catch (err) {
    console.error('Error fetching blog details:', err);
    if (isDatabaseUnavailableError(err)) return res.status(404).json({ message: 'Blog post not found' });
    res.status(500).json({ message: 'Error fetching blog details' });
  }
};

exports.getPublicBranches = async (_req, res) => {
  try {
    const columns = await getTableColumns('branches');
    if (!columns) return res.json([]);

    const branches = await Branch.findAll({
      attributes: pickExisting(columns, PUBLIC_BRANCH_FIELDS),
      order: [['type', 'ASC'], ['name', 'ASC']],
    });

    res.json(branches.map(normalizeBranchPayload));
  } catch (err) {
    console.error('Error fetching branches:', err);
    if (isDatabaseUnavailableError(err)) return res.json([]);
    res.status(500).json({ message: 'Error fetching branches' });
  }
};

exports.getPublicBranchDetails = async (req, res) => {
  try {
    const branch = await findPublicBranchBySlug(req.params.slug, { activeOnly: true });
    if (!branch) return res.status(404).json({ message: 'Branch not found' });

    res.json(branch);
  } catch (err) {
    console.error('Error fetching branch details:', err);
    if (isDatabaseUnavailableError(err)) return res.status(404).json({ message: 'Branch not found' });
    res.status(500).json({ message: 'Error fetching branch details' });
  }
};

exports.getPublicBranchCourses = async (req, res) => {
  try {
    const branch = await findPublicBranchBySlug(req.params.slug, { activeOnly: true });
    if (!branch) return res.status(404).json({ message: 'Branch not found' });

    const courseFilter = await buildPublishedCourseWhere(branch.id);
    if (!courseFilter) return res.json([]);
    const { columns, where } = courseFilter;

    const courses = await Course.findAll({
      where,
      attributes: pickExisting(columns, PUBLIC_COURSE_FIELDS),
      order: [['created_at', 'DESC']],
    });

    res.json(courses.map(mapPublicCourse));
  } catch (err) {
    console.error('Error fetching branch courses:', err);
    if (isDatabaseUnavailableError(err)) return res.json([]);
    res.status(500).json({ message: 'Error fetching branch courses' });
  }
};

exports.getPublicBranchBlogs = async (req, res) => {
  try {
    const branch = await findPublicBranchBySlug(req.params.slug, { activeOnly: true });
    if (!branch) return res.status(404).json({ message: 'Branch not found' });

    const columns = await getTableColumns('blog_posts');
    if (!columns) return res.json([]);
    const where = {};
    if (hasColumn(columns, 'is_published')) where.is_published = true;
    if (hasColumn(columns, 'branch_id')) where.branch_id = branch.id;

    const blogs = await BlogPost.findAll({
      where,
      attributes: pickExisting(columns, PUBLIC_BLOG_FIELDS),
      order: hasColumn(columns, 'published_at') ? [['published_at', 'DESC']] : [['id', 'DESC']],
    });

    res.json(blogs);
  } catch (err) {
    console.error('Error fetching branch blogs:', err);
    if (isDatabaseUnavailableError(err)) return res.json([]);
    res.status(500).json({ message: 'Error fetching branch blogs' });
  }
};

exports.submitContactForm = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, email, phone, subject, message, course_interest, destination_country } = req.body;

    // Calculate a basic score: +20 for phone, +15 for email, +15 for course interest
    let score = 20;
    if (phone) score += 20;
    if (email) score += 15;
    if (course_interest || subject) score += 15;

    const lead = await Lead.create({
      branch_id: 1, // default HQ branch — website leads go to branch 1
      name,
      email,
      phone,
      destination_country,
      source: 'Website Enquiry',
      status: 'new',
      priority: 'medium',
      score,
      batch_interest: course_interest || subject || '',
      notes: `Subject: ${subject}\nMessage: ${message}`,
      last_activity_at: new Date(),
    }, { transaction: t });

    let contact = null;
    if (email) contact = await Contact.findOne({ where: { email, branch_id: 1 }, transaction: t });
    if (!contact && phone) contact = await Contact.findOne({ where: { phone, branch_id: 1 }, transaction: t });
    if (!contact) {
      contact = await Contact.create({
        branch_id: 1, name, phone, email, source: 'Website Enquiry', notes: `Subject: ${subject}\nMessage: ${message}`
      }, { transaction: t });
    }

    await Opportunity.create({
      branch_id: 1,
      title: `${lead.name} – Website Enquiry`,
      contact_id: contact.id, lead_id: lead.id,
      value: 0,
      stage: 'qualification',
      course_interest: course_interest || subject || '',
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ message: 'Enquiry submitted successfully! We will contact you shortly.', leadId: lead.id });

    // Fire Facebook CAPI 'Contact' event (non-blocking)
    fbCapi.sendContactEvent(req, { name, email, phone }).catch(() => {});
  } catch (err) {
    await t.rollback();
    console.error('Error submitting contact form:', err);
    res.status(500).json({ message: 'Error submitting contact form' });
  }
};

exports.getCourseBatches = async (req, res) => {
  try {
    const { slug } = req.params;
    const isId = /^\d+$/.test(slug);
    const branchId = parseBranchId(req) || await getMainBranchId();
    const courseColumns = await getTableColumns('courses');
    if (!courseColumns) return res.status(404).json({ message: 'Course not found' });
    const orConditions = [];
    if (hasColumn(courseColumns, 'slug')) orConditions.push({ slug });
    if (isId) orConditions.push({ id: parseInt(slug, 10) });
    if (orConditions.length === 0) return res.status(404).json({ message: 'Course not found' });
    const courseWhere = { [Op.or]: orConditions };
    const includeUnpublished = branchId && req.query?.booking === 'true';
    if (!includeUnpublished && hasColumn(courseColumns, 'is_published')) courseWhere.is_published = true;
    if (hasColumn(courseColumns, 'status')) courseWhere.status = 'active';
    if (branchId && hasColumn(courseColumns, 'branch_id')) courseWhere.branch_id = branchId;
    
    let course = await Course.findOne({ where: courseWhere });

    // If course not found under the requested branch, try without branch filter
    // (handles kiosk pages using HQ courses on a sub-branch)
    if (!course && branchId) {
      const fallbackWhere = { [Op.or]: orConditions };
      if (hasColumn(courseColumns, 'is_published')) fallbackWhere.is_published = true;
      if (hasColumn(courseColumns, 'status')) fallbackWhere.status = 'active';
      course = await Course.findOne({ where: fallbackWhere });
    }
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const batchColumns = await getTableColumns('batches');
    if (!batchColumns) return res.json([]);
    const batchWhere = { course_id: course.id };
    if (hasColumn(batchColumns, 'status')) batchWhere.status = { [Op.in]: ['enrolling', 'starting_soon'] };
    // Look for batches in the requested branch first, then fall back to course's own branch
    if (hasColumn(batchColumns, 'branch_id')) {
      batchWhere.branch_id = branchId || course.branch_id;
    }

    let batches = await Batch.findAll({
      where: batchWhere,
      attributes: pickExisting(batchColumns, ['id', 'name', 'start_date', 'schedule', 'capacity', 'enrolled']),
      order: hasColumn(batchColumns, 'start_date') ? [['start_date', 'ASC']] : [['id', 'ASC']]
    });

    // If no batches in the requested branch, fall back to the course's own branch batches
    if (batches.length === 0 && branchId && branchId !== course.branch_id && hasColumn(batchColumns, 'branch_id')) {
      batchWhere.branch_id = course.branch_id;
      batches = await Batch.findAll({
        where: batchWhere,
        attributes: pickExisting(batchColumns, ['id', 'name', 'start_date', 'schedule', 'capacity', 'enrolled']),
        order: hasColumn(batchColumns, 'start_date') ? [['start_date', 'ASC']] : [['id', 'ASC']]
      });
    }
    
    res.json(batches);
  } catch (err) {
    console.error('Error fetching course batches:', err);
    if (isDatabaseUnavailableError(err)) return res.json([]);
    res.status(500).json({ message: 'Error fetching course batches' });
  }
};

exports.submitCourseEnquiry = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { course_id, batch_id, name, email, phone, message, destination_country } = req.body;
    let course = null;
    let dealValue = 0;
    
    if (course_id) {
       course = await Course.findByPk(course_id, { transaction: t });
       if (course) dealValue = course.base_fee;
    }
    
    let batchName = '';
    if (batch_id) {
       const batch = await Batch.findByPk(batch_id, { transaction: t });
       if (batch) batchName = batch.name;
    }

    let score = 30;
    if (phone) score += 20;
    if (email) score += 15;

    const lead = await Lead.create({
      branch_id: 1, // default HQ
      name,
      email,
      phone,
      destination_country,
      source: 'website',
      status: 'interested',
      priority: 'high',
      score,
      course_id: course_id || null,
      batch_id: batch_id || null,
      batch_interest: batchName,
      deal_value: dealValue,
      notes: message ? `Enquiry Message: ${message}` : '',
      last_activity_at: new Date(),
    }, { transaction: t });

    let contact = null;
    if (email) contact = await Contact.findOne({ where: { email, branch_id: 1 }, transaction: t });
    if (!contact && phone) contact = await Contact.findOne({ where: { phone, branch_id: 1 }, transaction: t });
    if (!contact) {
      contact = await Contact.create({
        branch_id: 1, name, phone, email, source: 'website', notes: message ? `Enquiry Message: ${message}` : ''
      }, { transaction: t });
    }

    await Opportunity.create({
      branch_id: 1,
      title: `${lead.name} – ${course ? course.title : 'Course Enquiry'}`,
      contact_id: contact.id, lead_id: lead.id,
      value: dealValue,
      stage: 'qualification',
      course_interest: batchName || (course ? course.title : ''),
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ message: 'Enquiry submitted successfully! We will get in touch shortly.', leadId: lead.id });

    // Fire Facebook CAPI 'Lead' event (non-blocking)
    fbCapi.sendLeadEvent(req, {
      name, email, phone,
      courseName: course ? course.title : 'Course Enquiry',
      value: dealValue,
    }).catch(() => {});
  } catch (err) {
    await t.rollback();
    console.error('Error submitting course enquiry:', err);
    res.status(500).json({ message: 'Error submitting course enquiry' });
  }
};

exports.submitStudentBooking = async (req, res) => {
  let t = await sequelize.transaction();
  try {
    const branchId = parseBranchId(req);
    if (!branchId) {
      await t.rollback();
      return res.status(400).json({ message: 'Branch-specific booking link is required' });
    }

    const branch = await Branch.findOne({ where: { id: branchId, is_active: true }, transaction: t });
    if (!branch) {
      await t.rollback();
      return res.status(404).json({ message: 'Booking branch not found' });
    }

    const {
      course_id,
      batch_id,
      first_name,
      middle_name,
      last_name,
      name,
      email,
      phone,
      mobile_no,
      date_of_birth,
      father_name,
      mother_name,
      nid_birth_cert,
      current_address,
      permanent_address,
      course_reason,
      preferred_country,
      other_reason,
      post_course_goal_type,
      target_country,
      english_level,
      educational_details,
      employment_details,
      profession,
      message,
      channel
    } = req.body;

    const fullName = String(name || `${first_name || ''} ${last_name || ''}`.trim()).trim();
    const primaryPhone = String(phone || mobile_no || '').trim();
    const primaryEmail = String(email || '').trim();

    if (!fullName || !primaryPhone || !primaryEmail) {
      await t.rollback();
      return res.status(400).json({ message: 'Name, phone, and email are required' });
    }

    let course = null;
    let dealValue = 0;
    if (course_id) {
      course = await Course.findOne({ where: { id: course_id, branch_id: branchId, status: 'active' }, transaction: t });
      if (!course) {
        await t.rollback();
        return res.status(400).json({ message: 'Selected course is not available for this branch' });
      }
      dealValue = course.base_fee || 0;
    }

    let batch = null;
    if (batch_id) {
      batch = await Batch.findOne({ where: { id: batch_id, branch_id: branchId, ...(course ? { course_id: course.id } : {}) }, transaction: t });
      if (!batch) {
        await t.rollback();
        return res.status(400).json({ message: 'Selected batch is not available for this branch' });
      }
    }

    const normalizedCourseReason = normalizeCourseReason(course_reason);
    const normalizedPreferredCountry = normalizeText(preferred_country || target_country);
    const normalizedOtherReason = normalizedCourseReason === 'others' ? normalizeText(other_reason) : null;
    const normalizedGoalType = derivePostCourseGoalType(normalizedCourseReason, normalizedPreferredCountry, post_course_goal_type);

    const studentDetails = {
      first_name: first_name || fullName.split(' ')[0] || '',
      middle_name: middle_name || '',
      last_name: last_name || fullName.split(' ').slice(1).join(' ') || '',
      mobile_no: primaryPhone,
      email: primaryEmail,
      date_of_birth: date_of_birth || null,
      father_name: father_name || '',
      mother_name: mother_name || '',
      nid_birth_cert: nid_birth_cert || '',
      current_address: current_address || '',
      permanent_address: permanent_address || '',
      course_reason: normalizedCourseReason || '',
      course_reason_label: normalizedCourseReason ? PTE_REASON_LABELS[normalizedCourseReason] : '',
      preferred_country: normalizedPreferredCountry || '',
      other_reason: normalizedOtherReason || '',
      post_course_goal_type: normalizedGoalType || '',
      target_country: normalizedPreferredCountry || '',
      english_level: english_level || '',
      educational_details: normalizeEducationDetails(educational_details),
      employment_details: normalizeEmploymentDetails(employment_details),
      profession: profession || '',
    };

    const bookingChannel = ['kiosk', 'manual'].includes(channel) ? channel : 'manual';
    const notes = [
      `Student booking submitted from ${bookingChannel} link`,
      normalizedCourseReason ? `Reason: ${PTE_REASON_LABELS[normalizedCourseReason]}` : '',
      normalizedPreferredCountry ? `Preferred country: ${normalizedPreferredCountry}` : '',
      normalizedOtherReason ? `Other reason: ${normalizedOtherReason}` : '',
      message ? `Message: ${message}` : '',
      batch ? `Preferred batch: ${batch.name || batch.code}` : '',
    ].filter(Boolean).join('\n');

    const lead = await Lead.create({
      branch_id: branchId,
      name: fullName,
      email: primaryEmail,
      phone: primaryPhone,
      date_of_birth: date_of_birth || null,
      destination_country: normalizedPreferredCountry,
      source: 'walk_in',
      status: 'interested',
      priority: 'high',
      score: 80,
      course_id: course?.id || null,
      batch_id: batch?.id || null,
      batch_interest: course?.title || '',
      deal_value: dealValue,
      tags: {
        booking_type: 'student_booking',
        booking_channel: bookingChannel,
        branch_id: branchId,
        student_details: studentDetails,
      },
      notes,
      last_activity_at: new Date(),
    }, { transaction: t });

    let contact = null;
    contact = await Contact.findOne({ where: { email: primaryEmail, branch_id: branchId }, transaction: t });
    if (!contact) contact = await Contact.findOne({ where: { phone: primaryPhone, branch_id: branchId }, transaction: t });
    if (!contact) {
      contact = await Contact.create({
        branch_id: branchId,
        name: fullName,
        phone: primaryPhone,
        email: primaryEmail,
        source: 'walk_in',
        notes,
      }, { transaction: t });
    }

    await Opportunity.create({
      branch_id: branchId,
      title: `${fullName} – Student Booking`,
      contact_id: contact.id,
      lead_id: lead.id,
      value: dealValue,
      stage: 'qualification',
      course_interest: course?.title || 'Student Booking',
      description: `Public student booking via ${bookingChannel} link`,
    }, { transaction: t });

    await t.commit();
    t = null;
    res.status(201).json({ message: 'Booking submitted successfully. Our advisor will contact you shortly.', leadId: lead.id });

    fbCapi.sendLeadEvent(req, {
      name: fullName,
      email: primaryEmail,
      phone: primaryPhone,
      courseName: course?.title || 'Student Booking',
      value: dealValue,
    }).catch(() => {});
  } catch (err) {
    if (t) await t.rollback().catch(() => {});
    console.error('Error submitting student booking:', err);
    res.status(500).json({ message: 'Error submitting student booking' });
  }
};
