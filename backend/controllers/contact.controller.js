const { Op } = require('sequelize');
const Contact = require('../models/Contact');
const Client = require('../models/Client');
const ContactDocument = require('../models/ContactDocument');
const Communication = require('../models/Communication');
const PropertyInvoice = require('../models/PropertyInvoice');
const Payment = require('../models/Payment');
const RegisterEntry = require('../models/RegisterEntry');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const CONTACT_FIELDS = [
  'contact_type', 'salutation', 'first_name', 'last_name', 'full_name', 'company_name', 'designation',
  'primary_phone', 'alt_phone', 'whatsapp', 'email', 'alt_email', 'website',
  'preferred_contact_method', 'preferred_language',
  'address_line1', 'address_line2', 'area', 'city', 'district', 'postal_code', 'country',
  'national_id', 'passport_no', 'tin', 'trade_licence_no', 'company_reg_no',
  'date_of_birth', 'gender', 'nationality', 'is_nrb', 'nrb_country',
  'source', 'source_detail', 'assigned_to', 'tags', 'notes', 'status', 'authorisations',
  'do_not_email', 'do_not_sms',
];

function deriveFullName(body) {
  if (body.full_name && body.full_name.trim()) return body.full_name.trim();
  if (body.contact_type === 'company' && body.company_name) return body.company_name.trim();
  return [body.first_name, body.last_name].filter(Boolean).join(' ').trim();
}

// GET /api/contacts
exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };

  if (req.query.search) {
    const s = `%${req.query.search}%`;
    where[Op.or] = [
      { full_name: { [Op.like]: s } }, { company_name: { [Op.like]: s } },
      { primary_phone: { [Op.like]: s } }, { email: { [Op.like]: s } },
      { contact_code: { [Op.like]: s } },
    ];
  }
  if (req.query.status) where.status = req.query.status;
  if (req.query.contact_type) where.contact_type = req.query.contact_type;
  if (req.query.is_client !== undefined) where.is_client = req.query.is_client === 'true';
  if (req.query.is_nrb !== undefined) where.is_nrb = req.query.is_nrb === 'true';

  const { rows, count } = await Contact.findAndCountAll({
    where, limit, offset, order: [['created_at', 'DESC']],
  });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

// POST /api/contacts
exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, CONTACT_FIELDS);
  data.full_name = deriveFullName(req.body);
  if (!data.full_name) return res.status(400).json({ error: 'A name (full_name, first/last, or company_name) is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.contact_code = await generateCode(Contact, 'contact_code', 'SSPC-CT-');

  const contact = await Contact.create(data);
  res.status(201).json({ data: contact, message: 'Contact created.' });
});

// GET /api/contacts/:id
exports.getOne = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({
    where: { id: req.params.id, ...branchScope(req) },
    include: [{ model: ContactDocument, as: 'documents' }, { model: Client }],
  });
  if (!contact) return res.status(404).json({ error: 'Contact not found.' });

  const communications = await Communication.findAll({
    where: { entity_type: 'contact', entity_id: contact.id },
    order: [['occurred_at', 'DESC']], limit: 50,
  });

  const client = contact.Clients && contact.Clients[0];
  const invoices = await PropertyInvoice.findAll({
    where: {
      [Op.or]: [
        { contact_id: contact.id },
        client ? { client_id: client.id } : null
      ].filter(Boolean)
    },
    order: [['created_at', 'DESC']],
    limit: 100
  });

  let payments = [];
  let registerEntries = [];
  if (client) {
    payments = await Payment.findAll({
      where: { client_id: client.id },
      order: [['paid_at', 'DESC']],
      limit: 100
    });
    registerEntries = await RegisterEntry.findAll({
      where: { client_id: client.id },
      order: [['created_at', 'DESC']],
      limit: 200
    });
  }

  res.json({
    data: contact,
    communications,
    invoices,
    payments,
    registerEntries
  });
});

// GET /api/contacts/:id/relationships — the contact's sales footprint, grouped by property.
exports.relationships = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!contact) return res.status(404).json({ error: 'Contact not found.' });
  const cid = contact.id; const scope = branchScope(req);
  const { SaleOfferParty, SaleTransactionParty, SaleOffer, SaleTransaction } = require('../models/SalesModels');
  const PropertyDeal = require('../models/PropertyDeal');
  const PartyRoleProfile = require('../models/PartyRoleProfile');
  const BuyerMandate = require('../models/BuyerMandate');
  const NonCircumventionRecord = require('../models/NonCircumventionRecord');
  const EnvelopeSigner = require('../models/EnvelopeSigner');
  const SigningEnvelope = require('../models/SigningEnvelope');
  const Property = require('../models/Property');

  const [deals, offerParties, txParties, roles, mandates, intros, signerRows] = await Promise.all([
    PropertyDeal.findAll({ where: { ...scope, [Op.or]: [{ seller_contact_id: cid }, { owner_contact_id: cid }] }, raw: true }).catch(() => []),
    SaleOfferParty.findAll({ where: { contact_id: cid }, raw: true }).catch(() => []),
    SaleTransactionParty.findAll({ where: { contact_id: cid }, raw: true }).catch(() => []),
    PartyRoleProfile.findAll({ where: { contact_id: cid, ...scope }, raw: true }).catch(() => []),
    BuyerMandate.findAll({ where: { buyer_contact_id: cid, ...scope }, raw: true }).catch(() => []),
    NonCircumventionRecord.findAll({ where: { ...scope, context: 'sale', [Op.or]: [{ owner_contact_id: cid }, { tenant_contact_id: cid }] }, raw: true }).catch(() => []),
    EnvelopeSigner.findAll({ where: { contact_id: cid }, raw: true }).catch(() => []),
  ]);

  const offers = offerParties.length ? await SaleOffer.findAll({ where: { id: [...new Set(offerParties.map((p) => p.offer_id))] }, raw: true }) : [];
  const offerById = new Map(offers.map((o) => [o.id, o]));
  const txs = txParties.length ? await SaleTransaction.findAll({ where: { id: [...new Set(txParties.map((p) => p.transaction_id))] }, raw: true }) : [];
  const txById = new Map(txs.map((t) => [t.id, t]));
  const envIds = [...new Set(signerRows.map((s) => s.envelope_id))];
  const envs = envIds.length ? await SigningEnvelope.findAll({ where: { id: envIds }, attributes: ['id', 'envelope_code', 'title', 'status', 'related_type', 'related_id'], raw: true }) : [];

  const groups = new Map();
  const g = (pid) => { if (!groups.has(pid)) groups.set(pid, { deals: [], offers: [], transactions: [], roles: [], introductions: [] }); return groups.get(pid); };
  for (const d of deals) g(d.property_id).deals.push({ deal_code: d.deal_code, status: d.status, role: d.seller_contact_id === cid ? 'seller' : 'owner' });
  for (const p of offerParties) { const o = offerById.get(p.offer_id); if (o) g(o.property_id).offers.push({ offer_code: o.offer_code, amount: o.amount, status: o.status }); }
  for (const p of txParties) { const t = txById.get(p.transaction_id); if (t) g(t.property_id).transactions.push({ party_type: p.party_type, status: p.status }); }
  for (const r of roles) if (r.property_id) g(r.property_id).roles.push({ profile_code: r.profile_code, role_type: r.role_type, status: r.status });
  for (const n of intros) if (n.property_id) g(n.property_id).introductions.push({ record_code: n.record_code, status: n.status, side: n.owner_contact_id === cid ? 'seller' : 'buyer' });

  const pids = [...groups.keys()].filter(Boolean);
  const props = pids.length ? await Property.findAll({ where: { id: pids }, attributes: ['id', 'property_code', 'title'], raw: true }) : [];
  const propById = new Map(props.map((p) => [Number(p.id), p]));
  const by_property = [...groups.entries()].map(([pid, v]) => ({ property: propById.get(Number(pid)) || { id: pid }, ...v }));

  res.json({
    by_property,
    mandates: mandates.map((m) => ({ mandate_code: m.mandate_code, status: m.status })),
    agreements: envs.map((e) => ({ envelope_code: e.envelope_code, title: e.title, status: e.status, related_type: e.related_type, property_id: e.related_id })),
  });
});

// GET /api/contacts/:id/duplicates — advisory: other active contacts sharing an identifier.
exports.duplicates = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!contact) return res.status(404).json({ error: 'Contact not found.' });
  const ids = { primary_phone: contact.primary_phone, email: contact.email, national_id: contact.national_id, passport_no: contact.passport_no };
  const or = Object.entries(ids).filter(([, v]) => v && String(v).trim()).map(([k, v]) => ({ [k]: v }));
  if (!or.length) return res.json({ data: [] });
  const rows = await Contact.findAll({
    where: { ...branchScope(req), status: 'active', id: { [Op.ne]: contact.id }, [Op.or]: or },
    attributes: ['id', 'contact_code', 'full_name', 'primary_phone', 'email', 'national_id', 'passport_no'], raw: true,
  });
  const data = rows.map((r) => ({ id: r.id, contact_code: r.contact_code, full_name: r.full_name, matched_on: Object.keys(ids).filter((k) => ids[k] && r[k] === ids[k]) }));
  res.json({ data });
});

// PUT /api/contacts/:id
exports.update = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!contact) return res.status(404).json({ error: 'Contact not found.' });

  const data = pick(req.body, CONTACT_FIELDS);
  if (req.body.full_name !== undefined || req.body.first_name !== undefined || req.body.last_name !== undefined) {
    data.full_name = deriveFullName({ ...contact.toJSON(), ...req.body });
  }
  await contact.update(data);
  res.json({ data: contact, message: 'Contact updated.' });
});

// DELETE /api/contacts/:id
exports.remove = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!contact) return res.status(404).json({ error: 'Contact not found.' });
  await contact.destroy();
  res.json({ message: 'Contact deleted.' });
});

// ── Documents ──────────────────────────────────────────────────────────────
exports.addDocument = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!contact) return res.status(404).json({ error: 'Contact not found.' });
  const doc = await ContactDocument.create({
    contact_id: contact.id,
    ...pick(req.body, ['doc_type', 'title', 'file_url', 'file_name', 'mime_type', 'expiry_date']),
    uploaded_by: req.user?.id || null,
  });
  res.status(201).json({ data: doc });
});

exports.removeDocument = asyncHandler(async (req, res) => {
  const doc = await ContactDocument.findByPk(req.params.docId);
  if (!doc) return res.status(404).json({ error: 'Document not found.' });
  await doc.destroy();
  res.json({ message: 'Document removed.' });
});

// ── Communications ───────────────────────────────────────────────────────────
exports.addCommunication = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!contact) return res.status(404).json({ error: 'Contact not found.' });
  const comm = await Communication.create({
    branch_id: contact.branch_id,
    entity_type: 'contact', entity_id: contact.id,
    ...pick(req.body, ['channel', 'direction', 'subject', 'body', 'occurred_at', 'follow_up_at']),
    user_id: req.user?.id || null,
  });
  res.status(201).json({ data: comm });
});

// ── Convert contact to client ────────────────────────────────────────────────
exports.convertToClient = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!contact) return res.status(404).json({ error: 'Contact not found.' });

  const existing = await Client.findOne({ where: { contact_id: contact.id } });
  if (existing) return res.status(409).json({ error: 'This contact is already a client.', data: existing });

  const roles = pick(req.body, ['is_buyer', 'is_seller', 'is_landlord', 'is_tenant', 'is_service_client', 'is_nrb_client', 'client_segment', 'notes']);
  const client = await Client.create({
    branch_id: contact.branch_id,
    contact_id: contact.id,
    client_code: await generateCode(Client, 'client_code', 'SSPC-C-'),
    is_nrb_client: contact.is_nrb || false,
    ...roles,
    relationship_owner_id: req.user?.id || null,
    onboarded_at: new Date(),
    created_by: req.user?.id || null,
  });
  await contact.update({ is_client: true });
  res.status(201).json({ data: client, message: 'Contact converted to client.' });
});
