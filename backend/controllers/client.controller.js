const { Op } = require('sequelize');
const Client = require('../models/Client');
const Contact = require('../models/Contact');
const Communication = require('../models/Communication');
const PropertyInvoice = require('../models/PropertyInvoice');
const Payment = require('../models/Payment');
const RegisterEntry = require('../models/RegisterEntry');
const ContactDocument = require('../models/ContactDocument');
const PartyRoleProfile = require('../models/PartyRoleProfile');
const Property = require('../models/Property');
const SigningEnvelope = require('../models/SigningEnvelope');
const KycDocument = require('../models/KycDocument');
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

  if (req.query.contact_id) {
    where.contact_id = req.query.contact_id;
    let client = await Client.findOne({
      where,
      include: [Contact],
    });
    if (!client) {
      const contact = await Contact.findOne({ where: { id: req.query.contact_id, ...branchScope(req) } });
      if (contact) {
        const { generateCode } = require('../utils/codeGenerator');
        const clientCode = await generateCode(Client, 'client_code', 'SSPC-CL-');
        const newClient = await Client.create({
          branch_id: contact.branch_id,
          contact_id: contact.id,
          client_code: clientCode,
          is_buyer: true,
          is_tenant: true,
          status: 'active',
        });
        await contact.update({ is_client: true, is_buyer: true });
        client = await Client.findOne({ where: { id: newClient.id }, include: [Contact] });
      }
    }
    if (client) {
      return res.json({ data: [client], pagination: { page: 1, limit: 1, total: 1, pages: 1 } });
    }
  }

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
    include: [{ model: Contact, include: [{ model: ContactDocument, as: 'documents' }] }],
  });
  if (!client) return res.status(404).json({ error: 'Client not found.' });

  const contact = client.Contact;
  const contactId = contact?.id || 0;

  const communications = await Communication.findAll({
    where: { branch_id: client.branch_id, [Op.or]: [{ entity_type: 'client', entity_id: client.id }, { entity_type: 'contact', entity_id: contactId }] },
    order: [['occurred_at', 'DESC']], limit: 100,
  });

  const invoices = await PropertyInvoice.findAll({
    where: {
      branch_id: client.branch_id,
      [Op.or]: [
        { client_id: client.id },
        contactId ? { contact_id: contactId } : null
      ].filter(Boolean)
    },
    order: [['created_at', 'DESC']],
    limit: 100
  });

  const payments = await Payment.findAll({
    where: { client_id: client.id, branch_id: client.branch_id },
    order: [['paid_at', 'DESC']],
    limit: 100
  });

  const registerEntries = await RegisterEntry.findAll({
    where: { client_id: client.id, branch_id: client.branch_id },
    order: [['created_at', 'DESC']],
    limit: 200
  });

  const roleProfiles = contactId ? await PartyRoleProfile.findAll({
    where: { contact_id: contactId, branch_id: client.branch_id },
    include: [
      { model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'address', 'area', 'district'] },
      { model: SigningEnvelope, as: 'envelope', attributes: ['id', 'envelope_code', 'title', 'status', 'sent_at', 'completed_at'] },
    ],
    order: [['created_at', 'DESC']],
  }) : [];
  const profileIds = roleProfiles.map((profile) => profile.id);
  const kycDocuments = profileIds.length ? await KycDocument.findAll({
    where: { branch_id: client.branch_id, party_role_profile_id: { [Op.in]: profileIds } },
    order: [['created_at', 'DESC']],
  }) : [];

  // Related Tenancies
  const Tenancy = require('../models/Tenancy');
  const tenancies = contactId ? await Tenancy.findAll({
    where: {
      branch_id: client.branch_id,
      [Op.or]: [{ tenant_contact_id: contactId }, { owner_contact_id: contactId }]
    },
    include: [{ model: Property, attributes: ['id', 'property_code', 'title', 'address', 'area', 'city', 'district'] }],
    order: [['created_at', 'DESC']],
    limit: 50
  }) : [];

  // Related Care Work Orders
  const CareWorkOrder = require('../models/CareWorkOrder');
  const ServiceItem = require('../models/ServiceItem');
  const ServiceProvider = require('../models/ServiceProvider');
  const careWorkOrders = contactId ? await CareWorkOrder.findAll({
    where: { branch_id: client.branch_id, customer_contact_id: contactId },
    include: [
      { model: ServiceItem, as: 'service', attributes: ['id', 'name', 'code'] },
      { model: ServiceProvider, as: 'provider', attributes: ['id', 'provider_code', 'company_name'] }
    ],
    order: [['created_at', 'DESC']],
    limit: 50
  }) : [];

  // Related AMC Contracts
  const CareAmcContract = require('../models/CareAmcContract');
  const amcContracts = contactId ? await CareAmcContract.findAll({
    where: { branch_id: client.branch_id, customer_contact_id: contactId },
    order: [['created_at', 'DESC']],
    limit: 50
  }) : [];

  // Related Care Enquiries
  const CareEnquiry = require('../models/CareEnquiry');
  const careEnquiries = contactId ? await CareEnquiry.findAll({
    where: { branch_id: client.branch_id, customer_contact_id: contactId },
    order: [['created_at', 'DESC']],
    limit: 50
  }) : [];

  const invoiceTotal = invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
  const outstandingTotal = invoices.reduce((sum, invoice) => sum + Number(invoice.balance || 0), 0);
  const receivedTotal = payments
    .filter((payment) => payment.direction === 'incoming' && payment.status === 'completed')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  res.json({
    data: client,
    communications,
    invoices,
    payments,
    registerEntries,
    roleProfiles,
    kycDocuments,
    tenancies,
    careWorkOrders,
    amcContracts,
    careEnquiries,
    summary: {
      invoice_total: invoiceTotal,
      outstanding_total: outstandingTotal,
      received_total: receivedTotal,
      communications: communications.length,
      documents: (client.Contact?.documents || []).length + kycDocuments.length,
      role_profiles: roleProfiles.length,
      tenancies: tenancies.length,
      work_orders: careWorkOrders.length,
      amc_contracts: amcContracts.length,
      enquiries: careEnquiries.length,
    },
  });
});

// POST /api/clients
// Create new client or promote contact to client
exports.create = asyncHandler(async (req, res) => {
  const { generateCode } = require('../utils/codeGenerator');
  const { contact_id, full_name, email, primary_phone, company_name, district, is_buyer, is_seller, is_landlord, is_tenant, is_service_client, is_nrb_client, client_segment, notes } = req.body;

  let contact;
  if (contact_id) {
    contact = await Contact.findOne({ where: { id: contact_id, ...branchScope(req) } });
    if (!contact) return res.status(404).json({ error: 'Selected contact not found.' });
  } else {
    if (!full_name || !full_name.trim()) return res.status(400).json({ error: 'Full name is required.' });
    const contactCode = await generateCode(Contact, 'contact_code', 'SSPC-CT-');
    contact = await Contact.create({
      branch_id: req.user?.branch_id || 1,
      contact_code: contactCode,
      full_name: full_name.trim(),
      email: email ? email.trim() : null,
      primary_phone: primary_phone ? primary_phone.trim() : null,
      company_name: company_name ? company_name.trim() : null,
      district: district ? district.trim() : null,
      is_client: true,
      created_by: req.user?.id || null,
    });
  }

  const existingClient = await Client.findOne({ where: { contact_id: contact.id, ...branchScope(req) } });
  if (existingClient) {
    return res.status(400).json({ error: 'A client profile already exists for this contact.' });
  }

  const clientCode = await generateCode(Client, 'client_code', 'SSPC-CL-');
  const newClient = await Client.create({
    branch_id: contact.branch_id || req.user?.branch_id || 1,
    contact_id: contact.id,
    client_code: clientCode,
    is_buyer: !!is_buyer,
    is_seller: !!is_seller,
    is_landlord: !!is_landlord,
    is_tenant: !!is_tenant,
    is_service_client: !!is_service_client,
    is_nrb_client: !!is_nrb_client,
    client_segment: client_segment || 'standard',
    status: 'active',
    notes: notes || null,
    created_by: req.user?.id || null,
  });

  await contact.update({ is_client: true });

  const result = await Client.findOne({
    where: { id: newClient.id },
    include: [Contact],
  });

  res.status(201).json({ data: result, message: 'New client profile created successfully.' });
});

// POST /api/clients/:id/communications
// Logs calls/notes/messages and can dispatch an email immediately.
exports.addCommunication = asyncHandler(async (req, res) => {
  const client = await Client.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [Contact] });
  if (!client) return res.status(404).json({ error: 'Client not found.' });
  const data = pick(req.body, ['channel', 'direction', 'subject', 'body', 'occurred_at', 'follow_up_at', 'action_required', 'status']);
  if (!data.body && !data.subject) return res.status(400).json({ error: 'A subject or message is required.' });

  let dispatched = false;
  if (req.body.send_now === true && data.channel === 'email') {
    if (!client.Contact?.email) return res.status(400).json({ error: 'This client has no email address.' });
    const { sendEmail } = require('../services/communication.service');
    const result = await sendEmail(
      client.Contact.email,
      data.subject || 'Message from Seventh Sky Property Care',
      `<div style="white-space:pre-wrap">${String(data.body || '').replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]))}</div>`,
    );
    if (!result?.success) return res.status(502).json({ error: result?.error || 'Email could not be sent.' });
    dispatched = true;
  }
  if (req.body.send_now === true && ['sms', 'whatsapp'].includes(data.channel)) {
    const destination = data.channel === 'whatsapp'
      ? (client.Contact?.whatsapp || client.Contact?.primary_phone)
      : client.Contact?.primary_phone;
    if (!destination) return res.status(400).json({ error: `This client has no ${data.channel === 'sms' ? 'phone number' : 'WhatsApp number'}.` });
    const { sendSMS } = require('../services/communication.service');
    const result = await sendSMS(destination, [data.subject, data.body].filter(Boolean).join('\n'));
    if (!result?.success) return res.status(502).json({ error: result?.error || 'Message could not be sent.' });
    dispatched = true;
  }

  const communication = await Communication.create({
    branch_id: client.branch_id,
    entity_type: 'client',
    entity_id: client.id,
    channel: data.channel || 'note',
    direction: data.direction || (data.channel === 'note' ? 'internal' : 'outbound'),
    subject: data.subject || null,
    body: data.body || null,
    occurred_at: data.occurred_at || new Date(),
    follow_up_at: data.follow_up_at || null,
    action_required: data.action_required || null,
    status: data.status || 'done',
    user_id: req.user?.id || null,
  });
  res.status(201).json({ data: communication, dispatched, message: dispatched ? 'Email sent and activity logged.' : 'Client activity logged.' });
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
