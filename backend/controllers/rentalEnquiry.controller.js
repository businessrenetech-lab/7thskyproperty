const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const RentalEnquiry = require('../models/RentalEnquiry');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const { TenantApplication, TenantVerification } = require('../models/TenantApplication');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');
const { VERIFICATION_ITEMS } = require('../services/rentalWorkflow.service');

const FIELDS = ['property_id', 'contact_id', 'enquirer_name', 'phone', 'email', 'source', 'budget', 'preferred_area',
  'bedrooms_wanted', 'preferred_move_in', 'occupancy_requirement', 'lease_period', 'viewing_date', 'stage',
  'assigned_officer_id', 'next_action', 'follow_up_date', 'notes'];
const propInc = { model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'area', 'district'] };

const STAGES = ['new', 'contacted', 'viewing_scheduled', 'viewed', 'application_requested', 'application_received', 'shortlisted', 'rejected', 'converted'];

// ─── LIST (flat or grouped-by-stage kanban) ─────────────────────────────────
exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.property_id) where.property_id = req.query.property_id;
  if (req.query.stage) where.stage = req.query.stage;
  if (req.query.assigned_officer_id) where.assigned_officer_id = req.query.assigned_officer_id;
  if (req.query.search) {
    const s = `%${req.query.search}%`;
    where[Op.or] = [{ enquirer_name: { [Op.like]: s } }, { enquiry_code: { [Op.like]: s } }, { phone: { [Op.like]: s } }];
  }

  if (req.query.view === 'kanban') {
    const rows = await RentalEnquiry.findAll({ where, include: [propInc], order: [['updated_at', 'DESC']] });
    const board = STAGES.reduce((a, s) => { a[s] = []; return a; }, {});
    rows.forEach((r) => { (board[r.stage] || (board[r.stage] = [])).push(r); });
    return res.json({ board, stages: STAGES, total: rows.length });
  }

  const { limit, offset, page } = getPagination(req);
  const { rows, count } = await RentalEnquiry.findAndCountAll({ where, include: [propInc], limit, offset, order: [['created_at', 'DESC']] });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const e = await RentalEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [propInc, { model: Contact, as: 'contact', attributes: ['id', 'full_name', 'primary_phone', 'email'] }] });
  if (!e) return res.status(404).json({ error: 'Enquiry not found.' });
  res.json({ data: e });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.enquirer_name) return res.status(400).json({ error: 'enquirer_name is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.enquiry_code = await generateCode(RentalEnquiry, 'enquiry_code', 'SSPC-EQ-');
  const e = await RentalEnquiry.create(data);
  res.status(201).json({ data: e, message: `Enquiry ${e.enquiry_code} created.` });
});

exports.update = asyncHandler(async (req, res) => {
  const e = await RentalEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!e) return res.status(404).json({ error: 'Enquiry not found.' });
  await e.update(pick(req.body, FIELDS));
  res.json({ data: e });
});

// Move a card on the kanban (stage change).
exports.move = asyncHandler(async (req, res) => {
  const e = await RentalEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!e) return res.status(404).json({ error: 'Enquiry not found.' });
  if (!STAGES.includes(req.body.stage)) return res.status(400).json({ error: 'Invalid stage.' });
  await e.update({ stage: req.body.stage });
  res.json({ data: e });
});

exports.remove = asyncHandler(async (req, res) => {
  const e = await RentalEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!e) return res.status(404).json({ error: 'Enquiry not found.' });
  await e.destroy();
  res.json({ message: 'Enquiry removed.' });
});

// ─── CONVERT ENQUIRY → TENANT APPLICATION ───────────────────────────────────
exports.convertToApplication = asyncHandler(async (req, res) => {
  const e = await RentalEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!e) return res.status(404).json({ error: 'Enquiry not found.' });
  if (e.converted_application_id) return res.status(409).json({ error: 'This enquiry already has a linked application.' });

  const result = await sequelize.transaction(async (tx) => {
    const app = await TenantApplication.create({
      branch_id: e.branch_id, application_code: await generateCode(TenantApplication, 'application_code', 'SSPC-APP-'),
      property_id: req.body.property_id || e.property_id, tenant_contact_id: e.contact_id, enquiry_id: e.id,
      applicant_name: e.enquirer_name, mobile: e.phone, email: e.email, source: e.source,
      budget: e.budget, preferred_move_in: e.preferred_move_in, lease_period: e.lease_period,
      occupancy_requirement: e.occupancy_requirement, application_date: new Date().toISOString().slice(0, 10),
      status: 'submitted', assigned_officer_id: e.assigned_officer_id, created_by: req.user?.id || null,
    }, { transaction: tx });

    await TenantVerification.bulkCreate(
      VERIFICATION_ITEMS.map((v, i) => ({ application_id: app.id, item: v.item, required: true, status: 'pending', evidence_required: v.evidence_required, sort_order: i })),
      { transaction: tx }
    );
    await e.update({ stage: 'converted', converted_application_id: app.id }, { transaction: tx });
    return app;
  });

  res.status(201).json({ data: result, message: `Application ${result.application_code} created from enquiry.` });
});
