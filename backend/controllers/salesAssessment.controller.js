const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const User = require('../models/User');
const PropertyDocument = require('../models/PropertyDocument');
const PartyRoleProfile = require('../models/PartyRoleProfile');
const KycDocument = require('../models/KycDocument');
const { SaleProfile, SaleParty } = require('../models/SalesModels');
const {
  SaleAssessment,
  SaleAssessmentItem,
  SaleAppraisal,
  SaleAppraisalComparable,
  SaleProposal,
  SaleReportVersion,
} = require('../models/SalesAssessmentModels');
const { asyncHandler, branchScope, pick } = require('../utils/controllerHelpers');
const { recordEvent } = require('../services/salesSettlement.service');
const reportService = require('../services/salesAssessmentReport.service');
const { sendEmail, brandedEmailWrapper } = require('../services/communication.service');

const ASSESSMENT_FIELDS = ['owner_contact_id', 'assessed_by', 'scheduled_at', 'assessment_date', 'inspector_name', 'occupancy_status', 'overall_score', 'marketability_score', 'condition_summary', 'access_notes', 'marketability_notes', 'recommended_actions', 'photos', 'blockers'];
const ITEM_FIELDS = ['section', 'item_key', 'label', 'condition_status', 'score', 'priority', 'notes', 'recommendation', 'is_clean', 'is_undamaged', 'is_working', 'estimated_cost', 'photos', 'sort_order'];
const APPRAISAL_FIELDS = ['appraiser_id', 'appraisal_date', 'currency', 'market_value_min', 'recommended_value', 'market_value_max', 'approved_value', 'reserve_value', 'quick_sale_value', 'expected_days', 'confidence_score', 'valuation_method', 'market_summary', 'condition_adjustment_percent', 'location_adjustment_percent', 'assumptions', 'disclaimer', 'blockers', 'strengths', 'weaknesses'];
const COMPARABLE_FIELDS = ['title', 'address', 'property_type', 'transaction_type', 'transaction_date', 'asking_price', 'sale_price', 'adjusted_value', 'area', 'land_size', 'building_size', 'bedrooms', 'bathrooms', 'distance_km', 'adjustment_percent', 'source', 'source_url', 'notes', 'photos', 'sort_order'];
const PROPOSAL_FIELDS = ['appraisal_id', 'vendor_contact_id', 'proposal_date', 'valid_until', 'currency', 'proposed_asking_price', 'proposed_reserve_price', 'agency_type', 'commission_percent', 'commission_fixed', 'marketing_budget', 'marketing_plan', 'included_services', 'summary', 'terms', 'assumptions', 'disclaimer'];

const DEFAULT_ITEMS = [
  ['exterior_access', 'Exterior and access'],
  ['living', 'Living areas'],
  ['bedrooms', 'Bedrooms'],
  ['bathrooms', 'Bathrooms'],
  ['kitchen', 'Kitchen'],
  ['utilities', 'Utilities'],
  ['parking_facilities', 'Parking and building facilities'],
  ['land_boundaries', 'Land and boundaries'],
  ['documents_marketability', 'Documents and marketability'],
];

const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const plain = (row) => row?.get ? row.get({ plain: true }) : row;
const ip = (req) => req.ip || req.socket?.remoteAddress || null;
const hasValue = (value) => value !== null && value !== undefined && value !== '';
const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

function validateBounded(value, field) {
  if (!hasValue(value)) return;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100) fail(400, `${field} must be between 0 and 100`);
}

function validateAppraisalValues(values, requireComplete = false) {
  const min = hasValue(values.market_value_min) ? Number(values.market_value_min) : null;
  const recommended = hasValue(values.recommended_value) ? Number(values.recommended_value) : null;
  const max = hasValue(values.market_value_max) ? Number(values.market_value_max) : null;
  const optionalValues = ['approved_value', 'reserve_value', 'quick_sale_value'].map((field) => hasValue(values[field]) ? Number(values[field]) : null);
  if ([min, recommended, max, ...optionalValues].some((value) => value !== null && (!Number.isFinite(value) || value < 0))) fail(400, 'Appraisal values must be non-negative numbers');
  if (hasValue(values.expected_days) && (!Number.isInteger(Number(values.expected_days)) || Number(values.expected_days) < 0)) fail(400, 'expected_days must be a non-negative integer');
  if (requireComplete && [min, recommended, max].some((value) => value === null)) fail(400, 'market_value_min, recommended_value and market_value_max are required');
  if (min !== null && recommended !== null && min > recommended) fail(400, 'market_value_min must be less than or equal to recommended_value');
  if (recommended !== null && max !== null && recommended > max) fail(400, 'recommended_value must be less than or equal to market_value_max');
  if (min !== null && max !== null && min > max) fail(400, 'market_value_min must be less than or equal to market_value_max');
}

function validatePercentages(data) {
  for (const field of ['overall_score', 'marketability_score', 'score', 'confidence_score', 'condition_adjustment_percent', 'location_adjustment_percent', 'adjustment_percent', 'commission_percent']) {
    if (Object.prototype.hasOwnProperty.call(data, field)) validateBounded(data[field], field);
  }
}

function validateItemFlags(data) {
  for (const field of ['is_clean', 'is_undamaged', 'is_working']) {
    if (Object.prototype.hasOwnProperty.call(data, field) && data[field] !== null && typeof data[field] !== 'boolean') fail(400, `${field} must be true, false or null`);
  }
}

function validateAppraisalArrays(data) {
  for (const field of ['strengths', 'weaknesses']) {
    if (Object.prototype.hasOwnProperty.call(data, field) && data[field] !== null && !Array.isArray(data[field])) fail(400, `${field} must be an array`);
  }
}

async function propertyForRequest(req, propertyId, options = {}) {
  const property = await Property.findOne({ where: { id: propertyId, listing_type: 'sale', ...branchScope(req) }, ...options });
  if (!property) fail(404, 'Sale property not found');
  return property;
}

async function assessmentForRequest(req, id, options = {}) {
  const assessment = await SaleAssessment.findOne({ where: { id, ...branchScope(req) }, ...options });
  if (!assessment) fail(404, 'Assessment not found');
  return assessment;
}

async function appraisalForRequest(req, id, options = {}) {
  const appraisal = await SaleAppraisal.findOne({ where: { id, ...branchScope(req) }, ...options });
  if (!appraisal) fail(404, 'Appraisal not found');
  return appraisal;
}

async function proposalForRequest(req, id, options = {}) {
  const proposal = await SaleProposal.findOne({ where: { id, ...branchScope(req) }, ...options });
  if (!proposal) fail(404, 'Proposal not found');
  return proposal;
}

async function approvedAssessment(assessmentId, branchId, transaction) {
  const assessment = await SaleAssessment.findOne({ where: { id: assessmentId, branch_id: branchId }, transaction });
  if (!assessment) fail(404, 'Assessment not found');
  if (assessment.status !== 'approved') fail(409, 'Approve the site assessment before continuing');
  return assessment;
}

async function approvedAppraisal(appraisalId, assessmentId, branchId, transaction) {
  const appraisal = await SaleAppraisal.findOne({ where: { id: appraisalId, assessment_id: assessmentId, branch_id: branchId }, transaction });
  if (!appraisal) fail(404, 'Appraisal not found');
  if (appraisal.status !== 'approved') fail(409, 'Approve the appraisal before continuing');
  return appraisal;
}

async function validateProposalPrerequisites(proposal, transaction) {
  await approvedAssessment(proposal.assessment_id, proposal.branch_id, transaction);
  if (!proposal.appraisal_id) fail(409, 'An approved appraisal is required for this proposal');
  return approvedAppraisal(proposal.appraisal_id, proposal.assessment_id, proposal.branch_id, transaction);
}

async function itemWithAssessment(req, id, options = {}) {
  const item = await SaleAssessmentItem.findOne({ where: { id, ...branchScope(req) }, ...options });
  if (!item) fail(404, 'Assessment item not found');
  const assessment = await SaleAssessment.findOne({ where: { id: item.assessment_id, branch_id: item.branch_id }, ...options });
  if (!assessment) fail(404, 'Assessment not found');
  return { item, assessment };
}

async function comparableWithAppraisal(req, id, options = {}) {
  const comparable = await SaleAppraisalComparable.findOne({ where: { id, ...branchScope(req) }, ...options });
  if (!comparable) fail(404, 'Appraisal comparable not found');
  const appraisal = await SaleAppraisal.findOne({ where: { id: comparable.appraisal_id, branch_id: comparable.branch_id }, ...options });
  if (!appraisal) fail(404, 'Appraisal not found');
  return { comparable, appraisal };
}

async function lockedItemWithAssessment(req, itemId, transaction) {
  const discovered = await SaleAssessmentItem.findOne({ where: { id: itemId, ...branchScope(req) }, transaction });
  if (!discovered) fail(404, 'Assessment item not found');
  const assessment = await assessmentForRequest(req, discovered.assessment_id, { transaction, lock: transaction.LOCK.UPDATE });
  const item = await SaleAssessmentItem.findOne({
    where: { id: itemId, assessment_id: assessment.id, ...branchScope(req) },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!item) fail(404, 'Assessment item not found');
  return { item, assessment };
}

async function lockedAppraisalWithAssessment(req, appraisalId, transaction) {
  const discovered = await appraisalForRequest(req, appraisalId, { transaction });
  const assessment = await assessmentForRequest(req, discovered.assessment_id, { transaction, lock: transaction.LOCK.UPDATE });
  if (assessment.status !== 'approved') fail(409, 'Approve the site assessment before continuing');
  const appraisal = await SaleAppraisal.findOne({
    where: { id: appraisalId, assessment_id: assessment.id, ...branchScope(req) },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!appraisal) fail(404, 'Appraisal not found');
  return { appraisal, assessment };
}

async function lockedComparableWithAppraisal(req, comparableId, transaction) {
  const discovered = await SaleAppraisalComparable.findOne({ where: { id: comparableId, ...branchScope(req) }, transaction });
  if (!discovered) fail(404, 'Appraisal comparable not found');
  const { appraisal, assessment } = await lockedAppraisalWithAssessment(req, discovered.appraisal_id, transaction);
  const comparable = await SaleAppraisalComparable.findOne({
    where: { id: comparableId, appraisal_id: appraisal.id, ...branchScope(req) },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!comparable) fail(404, 'Appraisal comparable not found');
  return { comparable, appraisal, assessment };
}

async function validateContact(branchId, contactId, transaction) {
  if (!contactId) return;
  const contact = await Contact.findOne({ where: { id: contactId, branch_id: branchId }, transaction });
  if (!contact) fail(400, 'Contact must belong to the property branch');
}

async function validateUser(branchId, userId, transaction) {
  if (!userId) return;
  const user = await User.findOne({ where: { id: userId, branch_id: branchId, status: 'active' }, transaction });
  if (!user) fail(400, 'Assigned user must be active in the property branch');
}

async function audit(req, row, propertyId, eventType, oldValue, newValue, reason, transaction) {
  return recordEvent({
    branchId: row.branch_id,
    propertyId,
    entityType: row.constructor?.name || 'sales_assessment',
    entityId: row.id,
    eventType,
    actorId: req.user.id,
    oldValue,
    newValue,
    reason,
    ipAddress: ip(req),
    transaction,
  });
}

function ensureEditable(status, label) {
  if (!['draft', 'changes_requested'].includes(status)) fail(409, `${label} cannot be edited while ${status}`);
}

exports.getWorkspace = asyncHandler(async (req, res) => {
  const property = await propertyForRequest(req, req.params.propertyId);
  const branchWhere = { branch_id: property.branch_id };
  const [profile, assessment, proposals, reports, vendors, roleProfiles] = await Promise.all([
    SaleProfile.findOne({ where: { property_id: property.id, ...branchWhere } }),
    SaleAssessment.findOne({ where: { property_id: property.id, ...branchWhere } }),
    SaleProposal.findAll({ where: { property_id: property.id, ...branchWhere }, order: [['created_at', 'DESC']] }),
    SaleReportVersion.findAll({ where: { property_id: property.id, ...branchWhere }, order: [['generated_at', 'DESC']] }),
    SaleParty.findAll({
      where: { property_id: property.id, role: 'vendor', ...branchWhere },
      include: [{ model: Contact, required: false, where: branchWhere }],
      order: [['is_primary', 'DESC'], ['created_at', 'ASC']],
    }),
    PartyRoleProfile.findAll({ where: { property_id: property.id, role_type: 'vendor', ...branchWhere }, order: [['created_at', 'ASC']] }),
  ]);
  let items = [];
  let appraisal = null;
  let comparables = [];
  if (assessment) {
    [items, appraisal] = await Promise.all([
      SaleAssessmentItem.findAll({ where: { assessment_id: assessment.id, ...branchWhere }, order: [['sort_order', 'ASC'], ['id', 'ASC']] }),
      SaleAppraisal.findOne({ where: { assessment_id: assessment.id, ...branchWhere } }),
    ]);
    if (appraisal) comparables = await SaleAppraisalComparable.findAll({ where: { appraisal_id: appraisal.id, ...branchWhere }, order: [['sort_order', 'ASC'], ['id', 'ASC']] });
  }
  const kycDocuments = roleProfiles.length
    ? await KycDocument.findAll({ where: { party_role_profile_id: { [Op.in]: roleProfiles.map((profileRow) => profileRow.id) }, ...branchWhere }, order: [['created_at', 'DESC']] })
    : [];
  const documentScopes = [
    { property_id: property.id },
    { property_id: property.id, entity_type: 'property', entity_id: property.id },
  ];
  if (assessment) documentScopes.push({ property_id: property.id, entity_type: 'assessment', entity_id: assessment.id });
  const documents = await PropertyDocument.findAll({ where: { [Op.or]: documentScopes }, order: [['created_at', 'DESC']] });
  res.json({
    property,
    profile,
    assessment: assessment ? { ...plain(assessment), items } : null,
    appraisal: appraisal ? { ...plain(appraisal), comparables } : null,
    proposals,
    reports,
    vendors,
    role_profiles: roleProfiles,
    kyc_documents: kycDocuments,
    documents,
  });
});

exports.createAssessment = asyncHandler(async (req, res) => {
  const property = await propertyForRequest(req, req.params.propertyId);
  const data = pick(req.body, ASSESSMENT_FIELDS);
  validatePercentages(data);
  await validateContact(property.branch_id, data.owner_contact_id);
  await validateUser(property.branch_id, data.assessed_by);
  const assessment = await sequelize.transaction(async (transaction) => {
    const existing = await SaleAssessment.findOne({ where: { property_id: property.id, branch_id: property.branch_id }, transaction });
    if (existing) fail(409, 'An assessment already exists for this property');
    const created = await SaleAssessment.create({
      ...data,
      branch_id: property.branch_id,
      property_id: property.id,
      owner_contact_id: data.owner_contact_id || property.owner_contact_id || null,
      assessed_by: data.assessed_by || req.user.id,
      status: 'draft',
      created_by: req.user.id,
      updated_by: req.user.id,
    }, { transaction });
    await SaleAssessmentItem.bulkCreate(DEFAULT_ITEMS.map(([key, label], index) => ({
      branch_id: property.branch_id,
      assessment_id: created.id,
      section: key,
      item_key: key,
      label,
      sort_order: index + 1,
      created_by: req.user.id,
      updated_by: req.user.id,
    })), { transaction });
    await audit(req, created, property.id, 'ASSESSMENT_CREATED', null, plain(created), null, transaction);
    return created;
  });
  const items = await SaleAssessmentItem.findAll({ where: { assessment_id: assessment.id, branch_id: assessment.branch_id }, order: [['sort_order', 'ASC']] });
  res.status(201).json({ data: { ...plain(assessment), items } });
});

exports.updateAssessment = asyncHandler(async (req, res) => {
  const assessment = await sequelize.transaction(async (transaction) => {
    const locked = await assessmentForRequest(req, req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    ensureEditable(locked.status, 'Assessment');
    const data = pick(req.body, ASSESSMENT_FIELDS);
    validatePercentages(data);
    await validateContact(locked.branch_id, data.owner_contact_id, transaction);
    await validateUser(locked.branch_id, data.assessed_by, transaction);
    const oldValue = plain(locked);
    await locked.update({ ...data, updated_by: req.user.id }, { transaction });
    await audit(req, locked, locked.property_id, 'ASSESSMENT_UPDATED', oldValue, plain(locked), null, transaction);
    return locked;
  });
  res.json({ data: assessment });
});

exports.addAssessmentItem = asyncHandler(async (req, res) => {
  const item = await sequelize.transaction(async (transaction) => {
    const assessment = await assessmentForRequest(req, req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    ensureEditable(assessment.status, 'Assessment');
    const data = pick(req.body, ITEM_FIELDS);
    validatePercentages(data);
    validateItemFlags(data);
    if (!data.label && !data.item_key) fail(400, 'label or item_key is required');
    const nextOrder = data.sort_order ?? (Number(await SaleAssessmentItem.max('sort_order', {
      where: { assessment_id: assessment.id, branch_id: assessment.branch_id },
      transaction,
    })) || 0) + 1;
    const label = data.label || String(data.item_key).replace(/_/g, ' ');
    const created = await SaleAssessmentItem.create({
      ...data,
      label,
      item_key: data.item_key || label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
      section: data.section || 'other',
      sort_order: nextOrder,
      branch_id: assessment.branch_id,
      assessment_id: assessment.id,
      created_by: req.user.id,
      updated_by: req.user.id,
    }, { transaction });
    await audit(req, assessment, assessment.property_id, 'ASSESSMENT_ITEM_ADDED', null, plain(created), null, transaction);
    return created;
  });
  res.status(201).json({ data: item });
});

exports.updateAssessmentItem = asyncHandler(async (req, res) => {
  const item = await sequelize.transaction(async (transaction) => {
    const { item: lockedItem, assessment } = await lockedItemWithAssessment(req, req.params.id, transaction);
    ensureEditable(assessment.status, 'Assessment');
    const data = pick(req.body, ITEM_FIELDS);
    validatePercentages(data);
    validateItemFlags(data);
    const oldValue = plain(lockedItem);
    await lockedItem.update({ ...data, updated_by: req.user.id }, { transaction });
    await audit(req, assessment, assessment.property_id, 'ASSESSMENT_ITEM_UPDATED', oldValue, plain(lockedItem), null, transaction);
    return lockedItem;
  });
  res.json({ data: item });
});

exports.deleteAssessmentItem = asyncHandler(async (req, res) => {
  await sequelize.transaction(async (transaction) => {
    const { item, assessment } = await lockedItemWithAssessment(req, req.params.id, transaction);
    ensureEditable(assessment.status, 'Assessment');
    const oldValue = plain(item);
    await item.destroy({ transaction });
    await audit(req, assessment, assessment.property_id, 'ASSESSMENT_ITEM_DELETED', oldValue, null, null, transaction);
  });
  res.status(204).end();
});

exports.submitAssessment = asyncHandler(async (req, res) => {
  const assessment = await sequelize.transaction(async (transaction) => {
    const locked = await assessmentForRequest(req, req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    ensureEditable(locked.status, 'Assessment');
    validatePercentages(plain(locked));
    const items = await SaleAssessmentItem.findAll({ where: { assessment_id: locked.id, branch_id: locked.branch_id }, transaction });
    if (!items.length) fail(400, 'Assessment must contain at least one item');
    const incomplete = items.filter((item) => !item.condition_status || item.condition_status === 'not_assessed');
    if (incomplete.length) fail(400, `Complete or mark all assessment items not applicable before submitting (${incomplete.length} remaining)`);
    const oldStatus = locked.status;
    await locked.update({ status: 'submitted', submitted_by: req.user.id, submitted_at: new Date(), updated_by: req.user.id }, { transaction });
    await audit(req, locked, locked.property_id, 'ASSESSMENT_SUBMITTED', { status: oldStatus }, { status: locked.status }, null, transaction);
    return locked;
  });
  res.json({ data: assessment });
});

exports.approveAssessment = asyncHandler(async (req, res) => {
  const body = pick(req.body, ['approval_notes']);
  const result = await sequelize.transaction(async (transaction) => {
    const assessment = await assessmentForRequest(req, req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!['submitted', 'changes_requested'].includes(assessment.status)) fail(409, 'Only a submitted assessment or requested changes can be approved');
    validatePercentages(plain(assessment));
    const items = await SaleAssessmentItem.findAll({ where: { assessment_id: assessment.id, branch_id: assessment.branch_id }, transaction });
    const criticalItems = items.filter((item) => item.priority === 'critical');
    const blockers = Array.isArray(assessment.blockers) ? assessment.blockers.filter(Boolean) : [];
    if (criticalItems.length || blockers.length) fail(409, 'Resolve all assessment blockers before approval');
    const oldStatus = assessment.status;
    await assessment.update({ status: 'approved', approved_by: req.user.id, approved_at: new Date(), approval_notes: body.approval_notes || null, reopen_reason: null, updated_by: req.user.id }, { transaction });
    const [profile] = await SaleProfile.findOrCreate({
      where: { property_id: assessment.property_id, branch_id: assessment.branch_id },
      defaults: { assessment_status: 'complete', created_by: req.user.id, updated_by: req.user.id },
      transaction,
    });
    await profile.update({ assessment_status: 'complete', updated_by: req.user.id }, { transaction });
    await audit(req, assessment, assessment.property_id, 'ASSESSMENT_APPROVED', { status: oldStatus }, { status: 'approved', assessment_status: 'complete' }, body.approval_notes, transaction);
    return { assessment, profile };
  });
  res.json({ data: result.assessment, profile: result.profile });
});

exports.reopenAssessment = asyncHandler(async (req, res) => {
  const body = pick(req.body, ['reason', 'reopen_reason']);
  const reason = body.reason || body.reopen_reason;
  if (!reason) fail(400, 'A reopen reason is required');
  const result = await sequelize.transaction(async (transaction) => {
    const assessment = await assessmentForRequest(req, req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!['approved', 'submitted', 'changes_requested'].includes(assessment.status)) fail(409, 'Assessment is not in a reviewable state');
    const oldStatus = assessment.status;
    await assessment.update({ status: 'changes_requested', approved_by: null, approved_at: null, approval_notes: null, reopen_reason: reason, updated_by: req.user.id }, { transaction });
    const [profile] = await SaleProfile.findOrCreate({
      where: { property_id: assessment.property_id, branch_id: assessment.branch_id },
      defaults: { assessment_status: 'pending', created_by: req.user.id, updated_by: req.user.id },
      transaction,
    });
    await profile.update({ assessment_status: 'pending', updated_by: req.user.id }, { transaction });
    await SaleAppraisal.update({
      status: 'changes_requested', approved_by: null, approved_at: null, approval_notes: null, updated_by: req.user.id,
    }, {
      where: { assessment_id: assessment.id, branch_id: assessment.branch_id, status: { [Op.in]: ['submitted', 'approved'] } },
      transaction,
    });
    await SaleProposal.update({ status: 'expired', updated_by: req.user.id }, {
      where: { assessment_id: assessment.id, branch_id: assessment.branch_id, status: { [Op.in]: ['generated', 'sent', 'accepted'] } },
      transaction,
    });
    await SaleReportVersion.update({ status: 'superseded' }, {
      where: { assessment_id: assessment.id, branch_id: assessment.branch_id, status: 'generated' },
      transaction,
    });
    await audit(req, assessment, assessment.property_id, 'ASSESSMENT_REOPENED', { status: oldStatus }, { status: 'changes_requested', assessment_status: 'pending', downstream_records_invalidated: true }, reason, transaction);
    return { assessment, profile };
  });
  res.json({ data: result.assessment, profile: result.profile });
});

exports.upsertAppraisal = asyncHandler(async (req, res) => {
  const result = await sequelize.transaction(async (transaction) => {
    const assessment = await assessmentForRequest(req, req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (assessment.status !== 'approved') fail(409, 'Approve the site assessment before creating an appraisal');
    const data = pick(req.body, APPRAISAL_FIELDS);
    validatePercentages(data);
    validateAppraisalValues(data);
    validateAppraisalArrays(data);
    await validateUser(assessment.branch_id, data.appraiser_id, transaction);
    let appraisal = await SaleAppraisal.findOne({
      where: { assessment_id: assessment.id, branch_id: assessment.branch_id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (appraisal) {
      ensureEditable(appraisal.status, 'Appraisal');
      validateAppraisalValues({ ...plain(appraisal), ...data });
      const oldValue = plain(appraisal);
      await appraisal.update({ ...data, updated_by: req.user.id }, { transaction });
      await audit(req, appraisal, assessment.property_id, 'APPRAISAL_UPDATED', oldValue, plain(appraisal), null, transaction);
      return { appraisal, created: false };
    }
    appraisal = await SaleAppraisal.create({
      ...data,
      branch_id: assessment.branch_id,
      property_id: assessment.property_id,
      assessment_id: assessment.id,
      appraiser_id: data.appraiser_id || req.user.id,
      status: 'draft',
      created_by: req.user.id,
      updated_by: req.user.id,
    }, { transaction });
    await audit(req, appraisal, assessment.property_id, 'APPRAISAL_CREATED', null, plain(appraisal), null, transaction);
    return { appraisal, created: true };
  });
  res.status(result.created ? 201 : 200).json({ data: result.appraisal });
});

exports.updateAppraisal = asyncHandler(async (req, res) => {
  const appraisal = await sequelize.transaction(async (transaction) => {
    const { appraisal: locked } = await lockedAppraisalWithAssessment(req, req.params.id, transaction);
    ensureEditable(locked.status, 'Appraisal');
    const data = pick(req.body, APPRAISAL_FIELDS);
    validatePercentages(data);
    validateAppraisalValues({ ...plain(locked), ...data });
    validateAppraisalArrays(data);
    await validateUser(locked.branch_id, data.appraiser_id, transaction);
    const oldValue = plain(locked);
    await locked.update({ ...data, updated_by: req.user.id }, { transaction });
    await audit(req, locked, locked.property_id, 'APPRAISAL_UPDATED', oldValue, plain(locked), null, transaction);
    return locked;
  });
  res.json({ data: appraisal });
});

exports.addComparable = asyncHandler(async (req, res) => {
  const comparable = await sequelize.transaction(async (transaction) => {
    const { appraisal } = await lockedAppraisalWithAssessment(req, req.params.id, transaction);
    ensureEditable(appraisal.status, 'Appraisal');
    const data = pick(req.body, COMPARABLE_FIELDS);
    validatePercentages(data);
    if (!data.title && !data.address) fail(400, 'Comparable title or address is required');
    const nextOrder = data.sort_order ?? (Number(await SaleAppraisalComparable.max('sort_order', {
      where: { appraisal_id: appraisal.id, branch_id: appraisal.branch_id },
      transaction,
    })) || 0) + 1;
    const created = await SaleAppraisalComparable.create({ ...data, sort_order: nextOrder, branch_id: appraisal.branch_id, appraisal_id: appraisal.id, created_by: req.user.id, updated_by: req.user.id }, { transaction });
    await audit(req, appraisal, appraisal.property_id, 'APPRAISAL_COMPARABLE_ADDED', null, plain(created), null, transaction);
    return created;
  });
  res.status(201).json({ data: comparable });
});

exports.updateComparable = asyncHandler(async (req, res) => {
  const comparable = await sequelize.transaction(async (transaction) => {
    const { comparable: locked, appraisal } = await lockedComparableWithAppraisal(req, req.params.id, transaction);
    ensureEditable(appraisal.status, 'Appraisal');
    const data = pick(req.body, COMPARABLE_FIELDS);
    validatePercentages(data);
    const oldValue = plain(locked);
    await locked.update({ ...data, updated_by: req.user.id }, { transaction });
    await audit(req, appraisal, appraisal.property_id, 'APPRAISAL_COMPARABLE_UPDATED', oldValue, plain(locked), null, transaction);
    return locked;
  });
  res.json({ data: comparable });
});

exports.deleteComparable = asyncHandler(async (req, res) => {
  await sequelize.transaction(async (transaction) => {
    const { comparable, appraisal } = await lockedComparableWithAppraisal(req, req.params.id, transaction);
    ensureEditable(appraisal.status, 'Appraisal');
    const oldValue = plain(comparable);
    await comparable.destroy({ transaction });
    await audit(req, appraisal, appraisal.property_id, 'APPRAISAL_COMPARABLE_DELETED', oldValue, null, null, transaction);
  });
  res.status(204).end();
});

exports.submitAppraisal = asyncHandler(async (req, res) => {
  const appraisal = await sequelize.transaction(async (transaction) => {
    const { appraisal: locked } = await lockedAppraisalWithAssessment(req, req.params.id, transaction);
    ensureEditable(locked.status, 'Appraisal');
    validateAppraisalValues(plain(locked), true);
    validatePercentages(plain(locked));
    const oldStatus = locked.status;
    await locked.update({ status: 'submitted', submitted_by: req.user.id, submitted_at: new Date(), updated_by: req.user.id }, { transaction });
    await audit(req, locked, locked.property_id, 'APPRAISAL_SUBMITTED', { status: oldStatus }, { status: 'submitted' }, null, transaction);
    return locked;
  });
  res.json({ data: appraisal });
});

exports.approveAppraisal = asyncHandler(async (req, res) => {
  const appraisal = await sequelize.transaction(async (transaction) => {
    const { appraisal: locked } = await lockedAppraisalWithAssessment(req, req.params.id, transaction);
    if (!['submitted', 'changes_requested'].includes(locked.status)) fail(409, 'Only a submitted appraisal or requested changes can be approved');
    const body = pick(req.body, ['approval_notes']);
    validateAppraisalValues(plain(locked), true);
    validatePercentages(plain(locked));
    const oldStatus = locked.status;
    await locked.update({
      status: 'approved',
      approved_value: hasValue(locked.approved_value) ? locked.approved_value : locked.recommended_value,
      approved_by: req.user.id,
      approved_at: new Date(),
      approval_notes: body.approval_notes || null,
      updated_by: req.user.id,
    }, { transaction });
    await audit(req, locked, locked.property_id, 'APPRAISAL_APPROVED', { status: oldStatus }, { status: 'approved' }, body.approval_notes, transaction);
    return locked;
  });
  res.json({ data: appraisal });
});

exports.generateAppraisalReport = asyncHandler(async (req, res) => {
  const appraisal = await appraisalForRequest(req, req.params.id);
  await approvedAssessment(appraisal.assessment_id, appraisal.branch_id);
  if (appraisal.status !== 'approved') fail(409, 'Approve the appraisal before generating its report');
  validateAppraisalValues(plain(appraisal), true);
  const result = await reportService.generateAppraisalReport({ appraisalId: appraisal.id, scope: branchScope(req), actorId: req.user.id });
  await audit(req, appraisal, appraisal.property_id, 'APPRAISAL_REPORT_GENERATED', null, { report_id: result.report.id, version_number: result.report.version_number, snapshot_hash: result.report.snapshot_hash });
  res.status(201).json({ data: result.report, appraisal: result.source });
});

exports.createProposal = asyncHandler(async (req, res) => {
  const assessment = await assessmentForRequest(req, req.params.id);
  if (assessment.status !== 'approved') fail(409, 'Approve the site assessment before creating a proposal');
  const data = pick(req.body, PROPOSAL_FIELDS);
  validatePercentages(data);
  await validateContact(assessment.branch_id, data.vendor_contact_id);
  if (data.appraisal_id) {
    await approvedAppraisal(data.appraisal_id, assessment.id, assessment.branch_id);
  } else {
    const appraisal = await SaleAppraisal.findOne({ where: { assessment_id: assessment.id, branch_id: assessment.branch_id, status: 'approved' }, order: [['updated_at', 'DESC']] });
    if (appraisal) data.appraisal_id = appraisal.id;
  }
  if (!data.appraisal_id) fail(409, 'An approved appraisal is required before creating a proposal');
  const proposal = await SaleProposal.create({
    ...data,
    branch_id: assessment.branch_id,
    property_id: assessment.property_id,
    assessment_id: assessment.id,
    proposal_number: `SSPC-SP-${assessment.id}-${Date.now().toString(36).toUpperCase()}`,
    proposal_date: data.proposal_date || new Date().toISOString().slice(0, 10),
    status: 'draft',
    created_by: req.user.id,
    updated_by: req.user.id,
  });
  await audit(req, proposal, assessment.property_id, 'SALE_PROPOSAL_CREATED', null, plain(proposal));
  res.status(201).json({ data: proposal });
});

exports.updateProposal = asyncHandler(async (req, res) => {
  const proposal = await proposalForRequest(req, req.params.id);
  await validateProposalPrerequisites(proposal);
  if (!['draft', 'generated'].includes(proposal.status)) fail(409, `Proposal cannot be edited while ${proposal.status}`);
  const data = pick(req.body, PROPOSAL_FIELDS);
  validatePercentages(data);
  await validateContact(proposal.branch_id, data.vendor_contact_id);
  if (data.appraisal_id) {
    const appraisal = await SaleAppraisal.findOne({ where: { id: data.appraisal_id, assessment_id: proposal.assessment_id, branch_id: proposal.branch_id } });
    if (!appraisal) fail(400, 'Appraisal must belong to this proposal assessment');
  }
  const oldValue = plain(proposal);
  await proposal.update({ ...data, ...(proposal.status === 'generated' ? { status: 'draft' } : {}), updated_by: req.user.id });
  await audit(req, proposal, proposal.property_id, 'SALE_PROPOSAL_UPDATED', oldValue, plain(proposal));
  res.json({ data: proposal });
});

exports.generateProposal = asyncHandler(async (req, res) => {
  const proposal = await proposalForRequest(req, req.params.id);
  await validateProposalPrerequisites(proposal);
  if (!['draft', 'generated'].includes(proposal.status)) fail(409, `Proposal cannot be generated while ${proposal.status}`);
  validatePercentages(plain(proposal));
  const oldStatus = proposal.status;
  const result = await reportService.generateProposalReport({ proposalId: proposal.id, scope: branchScope(req), actorId: req.user.id });
  await audit(req, proposal, proposal.property_id, 'SALE_PROPOSAL_GENERATED', { status: oldStatus }, { status: 'generated', report_id: result.report.id, version_number: result.report.version_number, snapshot_hash: result.report.snapshot_hash });
  res.status(201).json({ data: result.source, report: result.report });
});

async function transitionProposal(req, res, action) {
  const proposal = await proposalForRequest(req, req.params.id);
  await validateProposalPrerequisites(proposal);
  const body = pick(req.body, ['reason', 'rejection_reason']);
  const transitions = {
    send: { from: ['generated'], to: 'sent', fields: { sent_at: new Date() } },
    accept: { from: ['sent'], to: 'accepted', fields: { accepted_at: new Date(), rejected_at: null, rejection_reason: null } },
    reject: { from: ['sent'], to: 'rejected', fields: { rejected_at: new Date(), rejection_reason: body.reason || body.rejection_reason || null } },
  };
  const transition = transitions[action];
  if (!transition.from.includes(proposal.status)) fail(409, `Proposal cannot be ${transition.to} while ${proposal.status}`);
  if (action === 'send' && !proposal.pdf_url) fail(409, 'Generate the proposal PDF before sending');
  if (action === 'reject' && !transition.fields.rejection_reason) fail(400, 'A rejection reason is required');

  if (action === 'send') {
    const [assessment, property, primaryVendor, report] = await Promise.all([
      SaleAssessment.findOne({ where: { id: proposal.assessment_id, branch_id: proposal.branch_id } }),
      Property.findOne({ where: { id: proposal.property_id, branch_id: proposal.branch_id } }),
      SaleParty.findOne({
        where: { property_id: proposal.property_id, branch_id: proposal.branch_id, role: 'vendor', status: 'active' },
        order: [['is_primary', 'DESC'], ['id', 'ASC']],
      }),
      SaleReportVersion.findOne({
        where: { proposal_id: proposal.id, branch_id: proposal.branch_id, report_type: 'proposal', status: 'generated' },
        order: [['version_number', 'DESC']],
      }),
    ]);
    const contactId = proposal.vendor_contact_id || assessment?.owner_contact_id || property?.owner_contact_id || primaryVendor?.contact_id;
    const vendor = contactId ? await Contact.findOne({ where: { id: contactId, branch_id: proposal.branch_id } }) : null;
    if (!vendor?.email) fail(400, 'The owner or vendor needs an email address before the proposal can be sent');
    const filePath = reportService.resolveReportFile(report);
    if (!filePath) fail(409, 'The generated proposal PDF could not be found; generate it again before sending');
    const propertyName = property?.title || property?.property_code || 'your property';
    const body = brandedEmailWrapper('Your property sales proposal', `
      <p style="margin:0 0 16px;color:#172033;line-height:1.6;">Dear ${escapeHtml(vendor.full_name || vendor.company_name || 'Property Owner')},</p>
      <p style="margin:0 0 16px;color:#172033;line-height:1.6;">Please find attached our sales appraisal and agency proposal for <strong>${escapeHtml(propertyName)}</strong>.</p>
      <p style="margin:0 0 16px;color:#172033;line-height:1.6;">The proposal includes the recommended market position, proposed asking price, agency terms and marketing approach. Please review it and contact your Seventh Sky representative with any questions.</p>
      <div style="margin:24px 0;padding:16px;border-left:4px solid #18B6D9;background:#f4f8fc;color:#344054;line-height:1.5;">This proposal is subject to ownership and compliance verification and the final signed sales agency agreement.</div>
      <p style="margin:0;color:#627086;line-height:1.6;">Regards,<br><strong style="color:#0B1F3A;">Seventh Sky Property Care</strong></p>
    `);
    const delivery = await sendEmail(
      vendor.email,
      `Sales proposal for ${propertyName}`,
      body,
      [{ filename: report.file_name, path: filePath }],
      'info',
    );
    if (!delivery?.success) fail(502, `Proposal email could not be sent: ${delivery?.error || 'mail service rejected the message'}`);
    if (!proposal.vendor_contact_id) transition.fields.vendor_contact_id = vendor.id;
  }

  const oldStatus = proposal.status;
  await proposal.update({ status: transition.to, ...transition.fields, updated_by: req.user.id });
  await audit(req, proposal, proposal.property_id, `SALE_PROPOSAL_${transition.to.toUpperCase()}`, { status: oldStatus }, { status: transition.to }, transition.fields.rejection_reason);
  res.json({ data: proposal });
}

exports.sendProposal = asyncHandler((req, res) => transitionProposal(req, res, 'send'));
exports.acceptProposal = asyncHandler((req, res) => transitionProposal(req, res, 'accept'));
exports.rejectProposal = asyncHandler((req, res) => transitionProposal(req, res, 'reject'));

exports.downloadReport = asyncHandler(async (req, res, next) => {
  const report = await SaleReportVersion.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!report) fail(404, 'Report not found');
  const filePath = reportService.resolveReportFile(report);
  if (!filePath) fail(404, 'Report file not found');
  res.download(filePath, report.file_name, (error) => {
    if (error && !res.headersSent) next(error);
  });
});

exports.downloadAssessmentPhoto = asyncHandler(async (req, res, next) => {
  const { item } = await itemWithAssessment(req, req.params.id);
  const index = Number(req.params.index);
  if (!Number.isInteger(index) || index < 0) fail(400, 'Invalid photo index');
  const photos = Array.isArray(item.photos) ? item.photos : [];
  const filePath = reportService.resolveLocalEvidence(photos[index]);
  if (!filePath) fail(404, 'Assessment photo not found');
  res.sendFile(filePath, (error) => {
    if (error && !res.headersSent) next(error);
  });
});
