const { Op } = require('sequelize');
const fs = require('fs');
const XLSX = require('xlsx');
const sequelize = require('../config/db.config');
const Contact = require('../models/Contact');
const Client = require('../models/Client');
const ContactDocument = require('../models/ContactDocument');
const Communication = require('../models/Communication');
const PropertyInvoice = require('../models/PropertyInvoice');
const Payment = require('../models/Payment');
const RegisterEntry = require('../models/RegisterEntry');
const { generateCode } = require('../utils/codeGenerator');
// Any interior sub-line (Residential, Fitness Room, …) uses the same 'interior'
// contact scope, so treat its service-line key as an interior scope too.
const { isInteriorLine } = require('../config/serviceLines');
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
  // Real Estate Lead & Contact Lists (Migration 0127)
  'contact_list', 'contact_lists', 'lead_status', 'lead_source', 'looking_for',
  'preferred_areas', 'property_types', 'budget_min', 'budget_max',
  'bedrooms_min', 'bathrooms_min', 'size_min_sft', 'financing_status', 'urgency',
  'last_contacted_at', 'lead_notes',
  'category', // residential | commercial — property-category segment (Migration 0128)
];

function deriveFullName(body) {
  if (body.full_name && body.full_name.trim()) return body.full_name.trim();
  if (body.contact_type === 'company' && body.company_name) return body.company_name.trim();
  return [body.first_name, body.last_name].filter(Boolean).join(' ').trim();
}

function normalizeJsonArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

// GET /api/contacts
exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const conditions = [branchScope(req)];

  // Domain Scoping: 'rental' vs 'sales' vs 'interior' vs 'short-stay' vs other services
  if (req.query.scope === 'rental') {
    conditions.push({
      [Op.or]: [
        { looking_for: 'rent' },
        { contact_list: { [Op.like]: '%Rental%' } },
        { contact_list: { [Op.like]: '%Tenant%' } },
        { contact_list: { [Op.like]: '%Landlord%' } },
      ],
    });
  } else if (req.query.scope === 'interior' || isInteriorLine(req.query.scope)) {
    conditions.push({
      [Op.or]: [
        { looking_for: { [Op.in]: ['interior', 'renovation', 'fitout', 'design'] } },
        { contact_list: { [Op.like]: '%Interior%' } },
        { contact_list: { [Op.like]: '%Design%' } },
        { contact_list: { [Op.like]: '%Renovation%' } },
        { contact_list: { [Op.like]: '%Fitout%' } },
        { contact_list: { [Op.like]: '%Styling%' } },
      ],
    });
  } else if (req.query.scope === 'short-stay') {
    conditions.push({
      [Op.or]: [
        { looking_for: { [Op.in]: ['short_stay', 'vacation_rental', 'stay'] } },
        { contact_list: { [Op.like]: '%Short Stay%' } },
        { contact_list: { [Op.like]: '%Guest%' } },
        { contact_list: { [Op.like]: '%Host%' } },
      ],
    });
  } else if (req.query.scope === 'water-tank') {
    conditions.push({
      [Op.or]: [
        { looking_for: { [Op.in]: ['water_tank', 'tank_cleaning'] } },
        { contact_list: { [Op.like]: '%Water Tank%' } },
        { contact_list: { [Op.like]: '%Tank%' } },
      ],
    });
  } else if (req.query.scope === 'air-conditioning') {
    conditions.push({
      [Op.or]: [
        { looking_for: { [Op.in]: ['air_conditioning', 'hvac', 'ac'] } },
        { contact_list: { [Op.like]: '%Air Conditioning%' } },
        { contact_list: { [Op.like]: '%AC%' } },
        { contact_list: { [Op.like]: '%HVAC%' } },
      ],
    });
  } else if (req.query.scope === 'sales') {
    conditions.push({
      [Op.and]: [
        {
          [Op.or]: [
            { looking_for: { [Op.notIn]: ['rent', 'interior', 'renovation', 'fitout', 'design', 'short_stay', 'water_tank', 'air_conditioning'] } },
            { looking_for: null },
          ],
        },
        {
          [Op.or]: [
            { contact_list: { [Op.notLike]: '%Rental%' } },
            { contact_list: null },
          ],
        },
        {
          [Op.or]: [
            { contact_list: { [Op.notLike]: '%Tenant%' } },
            { contact_list: null },
          ],
        },
        {
          [Op.or]: [
            { contact_list: { [Op.notLike]: '%Interior%' } },
            { contact_list: null },
          ],
        },
        {
          [Op.or]: [
            { contact_list: { [Op.notLike]: '%Short Stay%' } },
            { contact_list: null },
          ],
        },
      ],
    });
  }

  if (req.query.search) {
    const s = `%${req.query.search}%`;
    conditions.push({
      [Op.or]: [
        { full_name: { [Op.like]: s } },
        { company_name: { [Op.like]: s } },
        { primary_phone: { [Op.like]: s } },
        { email: { [Op.like]: s } },
        { contact_code: { [Op.like]: s } },
        { area: { [Op.like]: s } },
        { contact_list: { [Op.like]: s } },
      ],
    });
  }

  const where = conditions.length === 1 ? conditions[0] : { [Op.and]: conditions };

  if (req.query.status) where.status = req.query.status;
  if (req.query.contact_type) where.contact_type = req.query.contact_type;
  if (req.query.is_client !== undefined) where.is_client = req.query.is_client === 'true';
  if (req.query.is_nrb !== undefined) where.is_nrb = req.query.is_nrb === 'true';
  if (req.query.contact_list && req.query.contact_list !== 'all') {
    where.contact_list = req.query.contact_list;
  }
  if (req.query.lead_status && req.query.lead_status !== 'all') {
    where.lead_status = req.query.lead_status;
  }
  if (req.query.looking_for && req.query.looking_for !== 'all') {
    where.looking_for = req.query.looking_for;
  }
  // Property-category isolation (residential vs commercial console). Exact match
  // on the hard `category` column (backfilled in migration 0128, set on create),
  // so each console shows only its own directory in both directions.
  if (['commercial', 'residential', 'business'].includes(req.query.category)) {
    where.category = req.query.category;
  }

  // Sorting
  let order = [['created_at', 'DESC']];
  if (req.query.sort_by) {
    const sortCol = req.query.sort_by;
    const sortDir = req.query.order === 'ASC' ? 'ASC' : 'DESC';
    const allowedSortCols = ['created_at', 'updated_at', 'last_contacted_at', 'full_name', 'contact_code', 'budget_max'];
    if (allowedSortCols.includes(sortCol)) {
      order = [[sortCol, sortDir]];
    }
  }

  const { rows, count } = await Contact.findAndCountAll({
    where, limit, offset, order,
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
  // Stamp the property-category segment from body or console context; default residential.
  data.category = data.category || req.query.category || 'residential';
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

// ── Contact Lists & Groups ──────────────────────────────────────────────────
// GET /api/contacts/lists
exports.getContactLists = asyncHandler(async (req, res) => {
  const conditions = [branchScope(req)];

  if (req.query.scope === 'rental') {
    conditions.push({
      [Op.or]: [
        { looking_for: 'rent' },
        { contact_list: { [Op.like]: '%Rental%' } },
        { contact_list: { [Op.like]: '%Tenant%' } },
        { contact_list: { [Op.like]: '%Landlord%' } },
      ],
    });
  } else if (req.query.scope === 'interior' || isInteriorLine(req.query.scope)) {
    conditions.push({
      [Op.or]: [
        { looking_for: { [Op.in]: ['interior', 'renovation', 'fitout', 'design'] } },
        { contact_list: { [Op.like]: '%Interior%' } },
        { contact_list: { [Op.like]: '%Design%' } },
        { contact_list: { [Op.like]: '%Renovation%' } },
        { contact_list: { [Op.like]: '%Fitout%' } },
        { contact_list: { [Op.like]: '%Styling%' } },
      ],
    });
  } else if (req.query.scope === 'short-stay') {
    conditions.push({
      [Op.or]: [
        { looking_for: { [Op.in]: ['short_stay', 'vacation_rental', 'stay'] } },
        { contact_list: { [Op.like]: '%Short Stay%' } },
        { contact_list: { [Op.like]: '%Guest%' } },
        { contact_list: { [Op.like]: '%Host%' } },
      ],
    });
  } else if (req.query.scope === 'water-tank') {
    conditions.push({
      [Op.or]: [
        { looking_for: { [Op.in]: ['water_tank', 'tank_cleaning'] } },
        { contact_list: { [Op.like]: '%Water Tank%' } },
        { contact_list: { [Op.like]: '%Tank%' } },
      ],
    });
  } else if (req.query.scope === 'air-conditioning') {
    conditions.push({
      [Op.or]: [
        { looking_for: { [Op.in]: ['air_conditioning', 'hvac', 'ac'] } },
        { contact_list: { [Op.like]: '%Air Conditioning%' } },
        { contact_list: { [Op.like]: '%AC%' } },
        { contact_list: { [Op.like]: '%HVAC%' } },
      ],
    });
  } else if (req.query.scope === 'sales') {
    conditions.push({
      [Op.and]: [
        {
          [Op.or]: [
            { looking_for: { [Op.notIn]: ['rent', 'interior', 'renovation', 'fitout', 'design', 'short_stay', 'water_tank', 'air_conditioning'] } },
            { looking_for: null },
          ],
        },
        {
          [Op.or]: [
            { contact_list: { [Op.notLike]: '%Rental%' } },
            { contact_list: null },
          ],
        },
        {
          [Op.or]: [
            { contact_list: { [Op.notLike]: '%Tenant%' } },
            { contact_list: null },
          ],
        },
        {
          [Op.or]: [
            { contact_list: { [Op.notLike]: '%Interior%' } },
            { contact_list: null },
          ],
        },
        {
          [Op.or]: [
            { contact_list: { [Op.notLike]: '%Short Stay%' } },
            { contact_list: null },
          ],
        },
      ],
    });
  }

  const where = conditions.length === 1 ? conditions[0] : { [Op.and]: conditions };

  const listCounts = await Contact.findAll({
    where,
    attributes: [
      'contact_list',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    group: ['contact_list'],
    raw: true,
  });

  let defaultLists = [
    'General Leads',
    'VIP Buyers',
    'High-Net-Worth Investors',
    'Gulshan / Banani Luxury',
    'Commercial Clients',
    'NRB Expat Investors',
  ];

  if (req.query.scope === 'rental') {
    defaultLists = [
      'Rental Leads',
      'Prospective Tenants',
      'Active Tenants',
      'Landlords / Lessors',
    ];
  } else if (req.query.scope === 'interior' || isInteriorLine(req.query.scope)) {
    defaultLists = [
      'Interior Design Leads',
      'Full Home Renovation',
      'Modular Kitchen & Wardrobes',
      'Commercial & Office Fitout',
      'Luxury Villa Interiors',
      'Consultation & Styling',
    ];
  } else if (req.query.scope === 'short-stay') {
    defaultLists = [
      'Short Stay Guests',
      'Corporate Travel Leads',
      'Vacation Stay Inquiries',
      'Property Hosts & Owners',
    ];
  } else if (req.query.scope === 'water-tank') {
    defaultLists = [
      'Water Tank Leads',
      'AMC Cleaning Contracts',
      'Commercial Building Accounts',
      'Residential Societies',
    ];
  } else if (req.query.scope === 'air-conditioning') {
    defaultLists = [
      'AC Servicing Leads',
      'HVAC Installation Projects',
      'Commercial Maintenance Contracts',
      'Emergency Repair Inquiries',
    ];
  }

  const map = new Map();
  defaultLists.forEach((l) => map.set(l, 0));
  listCounts.forEach((r) => {
    if (r.contact_list && String(r.contact_list).trim()) {
      map.set(String(r.contact_list).trim(), Number(r.count) || 0);
    }
  });

  const data = Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  res.json({ data });
});

// ── Sample Excel / CSV Template ─────────────────────────────────────────────
// GET /api/contacts/sample-template
exports.sampleTemplate = asyncHandler(async (req, res) => {
  const format = req.query.format === 'csv' ? 'csv' : 'xlsx';

  const sampleRows = [
    {
      'Full Name': 'Farhan Chowdhury',
      'Company Name': 'Chowdhury Holdings Ltd',
      'Phone': '+8801711000111',
      'Email': 'farhan.chowdhury@example.com',
      'WhatsApp': '+8801711000111',
      'Contact List': 'VIP Buyers',
      'Lead Status': 'qualified',
      'Looking For': 'buy',
      'Preferred Areas': 'Gulshan 2, Banani',
      'Property Types': 'Penthouse, Luxury Apartment',
      'Budget Min': 35000000,
      'Budget Max': 60000000,
      'Bedrooms Min': 4,
      'Bathrooms Min': 4,
      'Size Min Sft': 3200,
      'Financing Status': 'cash_buyer',
      'Urgency': 'immediate',
      'Source': 'Direct Referral',
      'Address': 'Road 79, Gulshan 2, Dhaka',
      'Lead Notes': 'Looking for a high-floor duplex or penthouse with private terrace and minimum 2 dedicated car parking bays.',
    },
    {
      'Full Name': 'Nusrat Jahan',
      'Company Name': 'Apex Tech Solutions',
      'Phone': '+8801819222333',
      'Email': 'nusrat.jahan@example.com',
      'WhatsApp': '+8801819222333',
      'Contact List': 'NRB Expat Investors',
      'Lead Status': 'new',
      'Looking For': 'invest',
      'Preferred Areas': 'Bashundhara R/A, Purbachal',
      'Property Types': 'Apartment, Plot',
      'Budget Min': 15000000,
      'Budget Max': 25000000,
      'Bedrooms Min': 3,
      'Bathrooms Min': 3,
      'Size Min Sft': 1800,
      'Financing Status': 'pre_approved',
      'Urgency': '1_3_months',
      'Source': 'Website',
      'Address': 'Block C, Bashundhara R/A, Dhaka',
      'Lead Notes': 'Living in Toronto, Canada. Looking for ready or near-ready investment unit yielding 7%+ rental returns.',
    },
    {
      'Full Name': 'Syed M. Rahman',
      'Company Name': 'Rahman & Associates',
      'Phone': '+8801912333444',
      'Email': 'rahman.syed@example.com',
      'WhatsApp': '+8801912333444',
      'Contact List': 'Commercial Clients',
      'Lead Status': 'viewing_scheduled',
      'Looking For': 'rent',
      'Preferred Areas': 'Motijheel, Gulshan 1',
      'Property Types': 'Commercial Office',
      'Budget Min': 120000,
      'Budget Max': 250000,
      'Bedrooms Min': null,
      'Bathrooms Min': 2,
      'Size Min Sft': 2200,
      'Financing Status': 'cash_buyer',
      'Urgency': 'immediate',
      'Source': 'Walk-in',
      'Address': 'Kamal Ataturk Ave, Banani, Dhaka',
      'Lead Notes': 'Corporate headquarters relocation. Needs standby power generator, dedicated lifts, and cafeteria zone.',
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleRows);

  ws['!cols'] = [
    { wch: 22 },
    { wch: 26 },
    { wch: 18 },
    { wch: 28 },
    { wch: 18 },
    { wch: 22 },
    { wch: 16 },
    { wch: 14 },
    { wch: 26 },
    { wch: 28 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 32 },
    { wch: 50 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Contacts Template');

  if (format === 'csv') {
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="seventh-sky-crm-contacts-template.csv"');
    return res.send(csvContent);
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="seventh-sky-crm-contacts-template.xlsx"');
  res.send(buffer);
});

// ── Bulk Lead Import via Excel / CSV / JSON ─────────────────────────────────
// POST /api/contacts/bulk-import
exports.bulkImport = asyncHandler(async (req, res) => {
  let rawRows = [];

  if (req.file) {
    try {
      const workbook = XLSX.readFile(req.file.path);
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    } catch (err) {
      try { if (req.file.path) fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ error: `Failed to read Excel file: ${err.message}` });
    }
  } else if (req.body.contacts && Array.isArray(req.body.contacts)) {
    rawRows = req.body.contacts;
  } else {
    return res.status(400).json({ error: 'Please upload an Excel/CSV file or provide a contacts array.' });
  }

  if (!rawRows.length) {
    return res.status(400).json({ error: 'The uploaded file or payload contains no rows.' });
  }

  const branchId = resolveBranchId(req, req.body.branch_id);
  const updateExisting = req.body.update_duplicates === true || req.body.update_duplicates === 'true';
  const defaultList = req.body.default_contact_list || 'General Leads';

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNum = i + 2;

    const fullName = String(row['Full Name'] || row['full_name'] || row['Name'] || row['Contact Name'] || row['name'] || '').trim();
    const firstName = String(row['First Name'] || row['first_name'] || '').trim();
    const lastName = String(row['Last Name'] || row['last_name'] || '').trim();
    const companyName = String(row['Company Name'] || row['company_name'] || row['Company'] || row['company'] || '').trim();
    const phone = String(row['Phone'] || row['primary_phone'] || row['Mobile'] || row['phone'] || row['mobile'] || '').trim();
    const email = String(row['Email'] || row['email'] || row['Email Address'] || '').trim();
    const whatsapp = String(row['WhatsApp'] || row['whatsapp'] || row['WhatsApp Number'] || phone || '').trim();
    const contactList = String(row['Contact List'] || row['contact_list'] || row['List'] || row['group'] || defaultList).trim() || defaultList;
    const leadStatus = String(row['Lead Status'] || row['lead_status'] || row['Status'] || row['Stage'] || 'new').trim().toLowerCase();
    const lookingFor = String(row['Looking For'] || row['looking_for'] || row['Requirement'] || row['Interest'] || '').trim().toLowerCase() || null;

    const rawAreas = row['Preferred Areas'] || row['preferred_areas'] || row['Location'] || row['Areas'] || '';
    const preferredAreas = normalizeJsonArray(rawAreas);
    const rawTypes = row['Property Types'] || row['property_types'] || row['Type'] || row['Property Type'] || '';
    const propertyTypes = normalizeJsonArray(rawTypes);

    const budgetMin = parseFloat(row['Budget Min'] || row['budget_min'] || row['Min Budget'] || 0) || null;
    const budgetMax = parseFloat(row['Budget Max'] || row['budget_max'] || row['Max Budget'] || row['Budget'] || 0) || null;
    const bedroomsMin = parseInt(row['Bedrooms Min'] || row['bedrooms_min'] || row['Bedrooms'] || row['Beds'] || 0, 10) || null;
    const bathroomsMin = parseInt(row['Bathrooms Min'] || row['bathrooms_min'] || row['Bathrooms'] || row['Baths'] || 0, 10) || null;
    const sizeMinSft = parseInt(row['Size Min Sft'] || row['size_min_sft'] || row['Size'] || row['Area Sft'] || 0, 10) || null;

    const financingStatus = String(row['Financing Status'] || row['financing_status'] || row['Financing'] || '').trim() || null;
    const urgency = String(row['Urgency'] || row['urgency'] || row['Timeline'] || '').trim() || null;
    const source = String(row['Source'] || row['lead_source'] || row['source'] || 'Excel Import').trim();
    const address = String(row['Address'] || row['address_line1'] || row['Address Line 1'] || '').trim();
    const area = String(row['Area'] || row['area'] || '').trim();
    const city = String(row['City'] || row['city'] || 'Dhaka').trim();
    const leadNotes = String(row['Lead Notes'] || row['lead_notes'] || row['Notes'] || row['notes'] || row['Remarks'] || '').trim();

    const resolvedName = fullName || [firstName, lastName].filter(Boolean).join(' ') || companyName;
    if (!resolvedName && !phone && !email) {
      continue;
    }
    if (!resolvedName) {
      errors.push({ row: rowNum, error: 'Full name or company name is missing.' });
      skippedCount++;
      continue;
    }

    try {
      const dupConditions = [];
      if (phone) dupConditions.push({ primary_phone: phone });
      if (email) dupConditions.push({ email: email });

      let existingContact = null;
      if (dupConditions.length) {
        existingContact = await Contact.findOne({
          where: {
            branch_id: branchId,
            [Op.or]: dupConditions,
          },
        });
      }

      if (existingContact) {
        if (updateExisting) {
          await existingContact.update({
            full_name: resolvedName || existingContact.full_name,
            company_name: companyName || existingContact.company_name,
            whatsapp: whatsapp || existingContact.whatsapp,
            contact_list: contactList || existingContact.contact_list,
            lead_status: leadStatus || existingContact.lead_status,
            looking_for: lookingFor || existingContact.looking_for,
            preferred_areas: preferredAreas.length ? preferredAreas : existingContact.preferred_areas,
            property_types: propertyTypes.length ? propertyTypes : existingContact.property_types,
            budget_min: budgetMin ?? existingContact.budget_min,
            budget_max: budgetMax ?? existingContact.budget_max,
            bedrooms_min: bedroomsMin ?? existingContact.bedrooms_min,
            bathrooms_min: bathroomsMin ?? existingContact.bathrooms_min,
            size_min_sft: sizeMinSft ?? existingContact.size_min_sft,
            financing_status: financingStatus || existingContact.financing_status,
            urgency: urgency || existingContact.urgency,
            lead_notes: leadNotes
              ? `${existingContact.lead_notes ? existingContact.lead_notes + '\n---\n' : ''}${leadNotes}`
              : existingContact.lead_notes,
          });
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        const contactCode = await generateCode(Contact, 'contact_code', 'SSPC-CT-');
        await Contact.create({
          branch_id: branchId,
          contact_code: contactCode,
          contact_type: companyName && !firstName ? 'company' : 'individual',
          full_name: resolvedName,
          first_name: firstName || resolvedName.split(' ')[0],
          last_name: lastName || resolvedName.split(' ').slice(1).join(' '),
          company_name: companyName,
          primary_phone: phone || null,
          whatsapp: whatsapp || null,
          email: email || null,
          contact_list: contactList,
          contact_lists: [contactList],
          lead_status: leadStatus || 'new',
          lead_source: source,
          source: source,
          looking_for: lookingFor,
          preferred_areas: preferredAreas,
          property_types: propertyTypes,
          budget_min: budgetMin,
          budget_max: budgetMax,
          bedrooms_min: bedroomsMin,
          bathrooms_min: bathroomsMin,
          size_min_sft: sizeMinSft,
          financing_status: financingStatus,
          urgency: urgency,
          address_line1: address,
          area: area,
          city: city,
          lead_notes: leadNotes,
          notes: leadNotes,
          status: 'active',
          created_by: req.user?.id || null,
          last_contacted_at: null,
        });
        createdCount++;
      }
    } catch (rowErr) {
      errors.push({ row: rowNum, name: resolvedName, error: rowErr.message });
      skippedCount++;
    }
  }

  res.json({
    message: `Bulk import completed: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped.`,
    data: {
      total: rawRows.length,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errors.slice(0, 50),
    },
  });
});

// ── Log Last Contacted Date ──────────────────────────────────────────────────
// POST /api/contacts/:id/touch
exports.touchLastContacted = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!contact) return res.status(404).json({ error: 'Contact not found.' });

  const contactedAt = req.body.last_contacted_at ? new Date(req.body.last_contacted_at) : new Date();
  await contact.update({ last_contacted_at: contactedAt });
  res.json({ data: contact, message: 'Contact touch logged.' });
});

