const sequelize = require('../config/db.config');
const Client = require('../models/Client');
const Contact = require('../models/Contact');
const ServiceProvider = require('../models/ServiceProvider');
const Tenancy = require('../models/Tenancy');
const Property = require('../models/Property');
const PropertyDeal = require('../models/PropertyDeal');
const PropertyInvoice = require('../models/PropertyInvoice');
const { asyncHandler } = require('../utils/controllerHelpers');

const propLite = { model: Property, attributes: ['id', 'property_code', 'title', 'area', 'district'] };

// GET /api/portal/dashboard — returns ONLY the signed-in user's own records.
exports.dashboard = asyncHandler(async (req, res) => {
  const role = req.user.role;
  const client = await Client.findOne({ where: { portal_user_id: req.user.id }, include: [{ model: Contact }] });
  const provider = await ServiceProvider.findOne({ where: { portal_user_id: req.user.id } });
  const contactId = client?.contact_id || null;

  const out = { role, linked: !!(client || provider), profile: {
    name: req.user.name, email: req.user.email,
    code: client?.client_code || provider?.provider_code || null,
  }, sections: {} };

  if (!out.linked) return res.json({ data: out }); // no portal linkage yet

  if (role === 'tenant') {
    out.sections.tenancies = await Tenancy.findAll({ where: { tenant_contact_id: contactId }, include: [propLite] });
    out.sections.invoices = await PropertyInvoice.findAll({ where: { contact_id: contactId, invoice_kind: 'client' }, order: [['created_at', 'DESC']], limit: 50 });
    const [ledger] = await sequelize.query('SELECT * FROM rental_ledger WHERE tenant_contact_id = :c ORDER BY period_label DESC LIMIT 36', { replacements: { c: contactId } });
    out.sections.ledger = ledger;
  } else if (role === 'buyer') {
    out.sections.deals = await PropertyDeal.findAll({ where: { buyer_client_id: client.id }, include: [propLite], order: [['created_at', 'DESC']] });
    out.sections.invoices = await PropertyInvoice.findAll({ where: { client_id: client.id }, order: [['created_at', 'DESC']], limit: 50 });
  } else if (role === 'owner') {
    out.sections.properties = await Property.findAll({ where: { owner_contact_id: contactId }, attributes: ['id', 'property_code', 'title', 'status', 'area', 'district'] });
    out.sections.tenancies = await Tenancy.findAll({ where: { owner_contact_id: contactId }, include: [propLite] });
    const [disb] = await sequelize.query('SELECT * FROM owner_disbursements WHERE owner_contact_id = :c ORDER BY created_at DESC LIMIT 50', { replacements: { c: contactId } });
    out.sections.disbursements = disb;
  } else if (role === 'supplier') {
    const [wos] = await sequelize.query('SELECT id, work_order_code, title, status, scheduled_date, amount FROM work_orders WHERE provider_id = :p ORDER BY created_at DESC LIMIT 100', { replacements: { p: provider.id } });
    out.sections.work_orders = wos;
    out.sections.invoices = await PropertyInvoice.findAll({ where: { provider_id: provider.id, invoice_kind: 'provider' }, order: [['created_at', 'DESC']], limit: 50 });
  }
  res.json({ data: out });
});
