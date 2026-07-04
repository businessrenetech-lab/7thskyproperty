const { Op } = require('sequelize');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const Tenancy = require('../models/Tenancy');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const contactAttrs = ['id', 'full_name', 'primary_phone', 'email'];
const commonIncludes = [
  { model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'area', 'district'] },
  { model: Contact, as: 'tenant', attributes: contactAttrs },
  { model: Contact, as: 'owner', attributes: contactAttrs },
];

function searchWhere(modelSearchFields, term) {
  if (!term || !modelSearchFields?.length) return null;
  const s = `%${term}%`;
  return { [Op.or]: modelSearchFields.map((field) => ({ [field]: { [Op.like]: s } })) };
}

function makeController({ Model, fields, codeField, codePrefix, searchFields = [], include = commonIncludes, defaults = {} }) {
  const list = asyncHandler(async (req, res) => {
    const { limit, offset, page } = getPagination(req);
    const where = { ...branchScope(req) };
    for (const key of ['property_id', 'tenancy_id', 'tenant_contact_id', 'owner_contact_id', 'status', 'payment_status', 'priority', 'risk_rating']) {
      if (req.query[key] !== undefined && req.query[key] !== '') where[key] = req.query[key];
    }
    Object.assign(where, searchWhere(searchFields, req.query.search) || {});
    const { rows, count } = await Model.findAndCountAll({ where, include, limit, offset, order: [['created_at', 'DESC']] });
    res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
  });

  const getOne = asyncHandler(async (req, res) => {
    const row = await Model.findOne({ where: { id: req.params.id, ...branchScope(req) }, include });
    if (!row) return res.status(404).json({ error: 'Record not found.' });
    res.json({ data: row });
  });

  const create = asyncHandler(async (req, res) => {
    const data = { ...defaults, ...pick(req.body, fields) };
    data.branch_id = resolveBranchId(req, req.body.branch_id);
    data.created_by = req.user?.id || null;
    if (codeField) data[codeField] = await generateCode(Model, codeField, codePrefix);
    const row = await Model.create(data);
    res.status(201).json({ data: row, message: 'Record created.' });
  });

  const update = asyncHandler(async (req, res) => {
    const row = await Model.findOne({ where: { id: req.params.id, ...branchScope(req) } });
    if (!row) return res.status(404).json({ error: 'Record not found.' });
    const patch = pick(req.body, fields);
    if (patch.status === 'done' && 'completed_at' in row && !row.completed_at) patch.completed_at = new Date();
    await row.update(patch);
    res.json({ data: row, message: 'Record updated.' });
  });

  const remove = asyncHandler(async (req, res) => {
    const row = await Model.findOne({ where: { id: req.params.id, ...branchScope(req) } });
    if (!row) return res.status(404).json({ error: 'Record not found.' });
    await row.destroy();
    res.json({ message: 'Record removed.' });
  });

  return { list, getOne, create, update, remove };
}

module.exports = { makeController, commonIncludes };
