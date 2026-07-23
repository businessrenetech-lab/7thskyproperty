const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const SalesEnquiry = require('../models/SalesEnquiry');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const Client = require('../models/Client');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const FIELDS = ['property_id', 'contact_id', 'client_id', 'enquirer_name', 'phone', 'email', 'source',
  'budget', 'preferred_area', 'message', 'viewing_date', 'stage', 'assigned_officer_id', 'next_action',
  'follow_up_date', 'notes'];

const STAGES = ['new', 'contacted', 'viewing_scheduled', 'viewed', 'offer_made', 'converted', 'rejected'];

// Property is included so the table shows the related property and so we can
// filter enquiries to the dashboard's category (residential/commercial/rural…).
const propInc = (category) => ({
  model: Property, as: 'property',
  attributes: ['id', 'property_code', 'title', 'area', 'district', 'category', 'listing_type'],
  ...(category ? { where: { category }, required: true } : {}),
});
const contactInc = { model: Contact, as: 'contact', attributes: ['id', 'full_name', 'primary_phone', 'email', 'is_client'] };
const clientInc = { model: Client, as: 'client', attributes: ['id', 'client_code', 'is_buyer'] };

/**
 * Ensure the enquirer exists as a Contact (flagged is_buyer via its Client) and
 * as a buyer Client — "he enquired as a buyer, so he is a buyer client."
 * Matches an existing contact by phone or email within the branch; never
 * duplicates. Returns { contact, client }.
 */
async function ensureBuyerContactAndClient({ branchId, name, phone, email, actorId }, transaction) {
  let contact = null;
  const or = [];
  if (phone) or.push({ primary_phone: phone });
  if (email) or.push({ email });
  if (or.length) {
    contact = await Contact.findOne({ where: { branch_id: branchId, [Op.or]: or }, transaction });
  }
  if (!contact) {
    contact = await Contact.create({
      branch_id: branchId,
      contact_code: await generateCode(Contact, 'contact_code', 'SSPC-CT-'),
      contact_type: 'individual',
      full_name: name || 'Buyer enquiry',
      first_name: (name || '').split(' ')[0] || null,
      last_name: (name || '').split(' ').slice(1).join(' ') || null,
      primary_phone: phone || null,
      email: email || null,
      source: 'website',
      is_client: true,
      created_by: actorId || null,
    }, { transaction });
  } else if (!contact.is_client) {
    await contact.update({ is_client: true }, { transaction });
  }

  let client = await Client.findOne({ where: { contact_id: contact.id }, transaction });
  if (!client) {
    client = await Client.create({
      branch_id: branchId,
      contact_id: contact.id,
      client_code: await generateCode(Client, 'client_code', 'SSPC-C-'),
      is_buyer: true,
      relationship_owner_id: actorId || null,
      onboarded_at: new Date(),
      status: 'prospect',
      created_by: actorId || null,
    }, { transaction });
  } else if (!client.is_buyer) {
    await client.update({ is_buyer: true }, { transaction });
  }
  return { contact, client };
}

// ─── LIST (category-aware; flat table or kanban) ────────────────────────────
exports.list = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.property_id) where.property_id = req.query.property_id;
  if (req.query.stage) where.stage = req.query.stage;
  if (req.query.assigned_officer_id) where.assigned_officer_id = req.query.assigned_officer_id;
  if (req.query.search) {
    const s = `%${req.query.search}%`;
    where[Op.or] = [{ enquirer_name: { [Op.like]: s } }, { enquiry_code: { [Op.like]: s } }, { phone: { [Op.like]: s } }];
  }
  const category = req.query.category || null;
  const include = [propInc(category), contactInc, clientInc];

  if (req.query.view === 'kanban') {
    const rows = await SalesEnquiry.findAll({ where, include, order: [['updated_at', 'DESC']] });
    const board = STAGES.reduce((a, s) => { a[s] = []; return a; }, {});
    rows.forEach((r) => { (board[r.stage] || (board[r.stage] = [])).push(r); });
    return res.json({ board, stages: STAGES, total: rows.length });
  }

  const { limit, offset, page } = getPagination(req);
  const { rows, count } = await SalesEnquiry.findAndCountAll({ where, include, limit, offset, order: [['created_at', 'DESC']], distinct: true });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const e = await SalesEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [propInc(), contactInc, clientInc] });
  if (!e) return res.status(404).json({ error: 'Enquiry not found.' });
  res.json({ data: e });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.enquirer_name) return res.status(400).json({ error: 'enquirer_name is required.' });
  const branchId = resolveBranchId(req, req.body.branch_id);
  const result = await sequelize.transaction(async (tx) => {
    // A staff-created enquiry also creates/links the buyer contact + client,
    // unless one was explicitly supplied.
    if (!data.contact_id) {
      const { contact, client } = await ensureBuyerContactAndClient(
        { branchId, name: data.enquirer_name, phone: data.phone, email: data.email, actorId: req.user?.id },
        tx,
      );
      data.contact_id = contact.id;
      data.client_id = client.id;
    }
    data.branch_id = branchId;
    data.created_by = req.user?.id || null;
    data.enquiry_code = await generateCode(SalesEnquiry, 'enquiry_code', 'SSPC-BEQ-');
    return SalesEnquiry.create(data, { transaction: tx });
  });
  const full = await SalesEnquiry.findByPk(result.id, { include: [propInc(), contactInc, clientInc] });
  res.status(201).json({ data: full, message: `Enquiry ${result.enquiry_code} created.` });
});

exports.update = asyncHandler(async (req, res) => {
  const e = await SalesEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!e) return res.status(404).json({ error: 'Enquiry not found.' });
  await e.update(pick(req.body, FIELDS));
  const full = await SalesEnquiry.findByPk(e.id, { include: [propInc(), contactInc, clientInc] });
  res.json({ data: full });
});

exports.move = asyncHandler(async (req, res) => {
  const e = await SalesEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!e) return res.status(404).json({ error: 'Enquiry not found.' });
  if (!STAGES.includes(req.body.stage)) return res.status(400).json({ error: 'Invalid stage.' });
  await e.update({ stage: req.body.stage });
  res.json({ data: e });
});

exports.remove = asyncHandler(async (req, res) => {
  const e = await SalesEnquiry.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!e) return res.status(404).json({ error: 'Enquiry not found.' });
  await e.destroy();
  res.json({ message: 'Enquiry removed.' });
});

module.exports.ensureBuyerContactAndClient = ensureBuyerContactAndClient;
module.exports.STAGES = STAGES;
