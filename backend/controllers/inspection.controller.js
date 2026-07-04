const { Op } = require('sequelize');
const { Inspection, InspectionItem } = require('../models/Inspection');
const Property = require('../models/Property');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const FIELDS = ['property_id', 'tenancy_id', 'tenant_contact_id', 'owner_contact_id', 'project_id', 'client_id', 'inspection_type', 'status', 'scheduled_date', 'completed_date', 'inspector_id', 'summary', 'photo_video_evidence', 'follow_up_required', 'report_sent_to_owner', 'report_url'];
const propInc = { model: Property, as: 'property', attributes: ['id', 'property_code', 'title'] };

exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.type) where.inspection_type = req.query.type;
  const { rows, count } = await Inspection.findAndCountAll({ where, include: [propInc], limit, offset, order: [['created_at', 'DESC']] });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const insp = await Inspection.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [propInc, { model: InspectionItem, as: 'items' }] });
  if (!insp) return res.status(404).json({ error: 'Inspection not found.' });
  res.json({ data: insp });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.inspection_code = await generateCode(Inspection, 'inspection_code', 'SSPC-INS-');
  const insp = await Inspection.create(data);
  res.status(201).json({ data: insp, message: 'Inspection created.' });
});

exports.update = asyncHandler(async (req, res) => {
  const insp = await Inspection.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!insp) return res.status(404).json({ error: 'Inspection not found.' });
  await insp.update(pick(req.body, FIELDS));
  res.json({ data: insp });
});

exports.addItem = asyncHandler(async (req, res) => {
  const insp = await Inspection.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!insp) return res.status(404).json({ error: 'Inspection not found.' });
  const item = await InspectionItem.create({ inspection_id: insp.id, ...pick(req.body, ['area', 'item', 'required', 'finding', 'photo_required', 'risk_rating', 'deduction_required', 'action_required', 'responsible_id', 'condition', 'notes', 'photo_url', 'sort_order']) });
  res.status(201).json({ data: item });
});
