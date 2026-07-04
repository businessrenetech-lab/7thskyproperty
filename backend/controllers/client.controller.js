const { Op } = require('sequelize');
const Client = require('../models/Client');
const Contact = require('../models/Contact');
const Communication = require('../models/Communication');
const PropertyInvoice = require('../models/PropertyInvoice');
const Payment = require('../models/Payment');
const RegisterEntry = require('../models/RegisterEntry');
const { asyncHandler, branchScope, getPagination, pick } = require('../utils/controllerHelpers');

const CLIENT_FIELDS = [
  'is_buyer', 'is_seller', 'is_landlord', 'is_tenant', 'is_service_client', 'is_nrb_client',
  'client_segment', 'portal_enabled', 'relationship_owner_id', 'status', 'notes',
];

// GET /api/clients
exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.segment) where.client_segment = req.query.segment;
  // role filters: ?role=buyer|seller|landlord|tenant|service|nrb
  const roleMap = {
    buyer: 'is_buyer', seller: 'is_seller', landlord: 'is_landlord',
    tenant: 'is_tenant', service: 'is_service_client', nrb: 'is_nrb_client',
  };
  if (req.query.role && roleMap[req.query.role]) where[roleMap[req.query.role]] = true;

  const contactWhere = {};
  if (req.query.search) {
    const s = `%${req.query.search}%`;
    contactWhere[Op.or] = [
      { full_name: { [Op.like]: s } }, { primary_phone: { [Op.like]: s } },
      { email: { [Op.like]: s } }, { company_name: { [Op.like]: s } },
    ];
  }

  const { rows, count } = await Client.findAndCountAll({
    where, limit, offset, order: [['created_at', 'DESC']],
    include: [{ model: Contact, where: Object.keys(contactWhere).length ? contactWhere : undefined, required: !!req.query.search }],
  });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

// GET /api/clients/:id
exports.getOne = asyncHandler(async (req, res) => {
  const client = await Client.findOne({
    where: { id: req.params.id, ...branchScope(req) },
    include: [{ model: Contact }],
  });
  if (!client) return res.status(404).json({ error: 'Client not found.' });
  const communications = await Communication.findAll({
    where: { [Op.or]: [{ entity_type: 'client', entity_id: client.id }, { entity_type: 'contact', entity_id: client.Contact?.id || 0 }] },
    order: [['occurred_at', 'DESC']], limit: 50,
  });

  const invoices = await PropertyInvoice.findAll({
    where: {
      [Op.or]: [
        { client_id: client.id },
        client.Contact ? { contact_id: client.Contact.id } : null
      ].filter(Boolean)
    },
    order: [['created_at', 'DESC']],
    limit: 100
  });

  const payments = await Payment.findAll({
    where: { client_id: client.id },
    order: [['paid_at', 'DESC']],
    limit: 100
  });

  const registerEntries = await RegisterEntry.findAll({
    where: { client_id: client.id },
    order: [['created_at', 'DESC']],
    limit: 200
  });

  res.json({
    data: client,
    communications,
    invoices,
    payments,
    registerEntries
  });
});

// PUT /api/clients/:id
exports.update = asyncHandler(async (req, res) => {
  const client = await Client.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!client) return res.status(404).json({ error: 'Client not found.' });
  await client.update(pick(req.body, CLIENT_FIELDS));
  res.json({ data: client, message: 'Client updated.' });
});

// POST /api/clients/:id/portal-access  { email, password, role(buyer|tenant|owner), name? }
exports.enablePortal = asyncHandler(async (req, res) => {
  const bcrypt = require('bcryptjs');
  const User = require('../models/User');
  const client = await Client.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [Contact] });
  if (!client) return res.status(404).json({ error: 'Client not found.' });
  const { email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required.' });
  if (!['buyer', 'tenant', 'owner'].includes(role)) return res.status(400).json({ error: 'role must be buyer, tenant or owner.' });
  if (await User.findOne({ where: { email } })) return res.status(409).json({ error: 'A user with this email already exists.' });
  const user = await User.create({
    branch_id: client.branch_id, name: req.body.name || client.Contact?.full_name || email,
    email, password: await bcrypt.hash(password, 12), role, status: 'active',
  });
  await client.update({ portal_user_id: user.id, portal_enabled: true });
  res.status(201).json({ message: 'Portal access enabled.', data: { user_id: user.id, email, role } });
});

module.exports = exports;