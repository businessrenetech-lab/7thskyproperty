const sequelize = require('../config/db.config');
const Client = require('../models/Client');
const Contact = require('../models/Contact');
const ServiceProvider = require('../models/ServiceProvider');
const Tenancy = require('../models/Tenancy');
const Property = require('../models/Property');
const PropertyDeal = require('../models/PropertyDeal');
const PropertyInvoice = require('../models/PropertyInvoice');
const { asyncHandler } = require('../utils/controllerHelpers');

/*
 * The land record travels with a rural property everywhere in the portal.
 *
 * `area` and `district` cannot tell one rural parcel from another: an owner with
 * three plots in one upazila saw three identical rows. Mouza, khatiyan and dag
 * are what identify a parcel, and inside the portal they ARE shown — the viewer
 * is the owner or tenant of that land. The PUBLIC website deliberately withholds
 * khatiyan and dag; see services/publicPropertyShape.js.
 *
 * They are extra attributes on the same query, not a second one, and a
 * residential row simply carries them as null.
 */
const RURAL_LAND_ATTRS = ['upazila', 'union_name', 'village', 'mouza', 'khatiyan', 'dag', 'land_area_decimal', 'current_use'];

const propLite = {
  model: Property,
  attributes: ['id', 'property_code', 'title', 'area', 'district', 'category', 'listing_type', ...RURAL_LAND_ATTRS],
};

/**
 * The sale-side picture for an owner whose property is listed for sale: their
 * offers, their marketing progress and their commission position.
 *
 * Offers and marketing live on the rural_sale registers rather than tables of
 * their own, so they are read through register_entries, scoped to the owner's own
 * property ids. Nothing here widens what the signed-in user may see.
 */
async function sellerSections(propertyIds, contactId) {
  const out = { offers: [], marketing: [], deals: [] };
  if (!propertyIds.length) return out;

  const [rows] = await sequelize.query(
    `SELECT e.id, e.property_id, e.data, d.register_key
       FROM register_entries e
       JOIN register_definitions d ON d.id = e.register_definition_id
      WHERE e.property_id IN (:ids)
        AND d.vertical_key = 'rural_sale'
        AND d.register_key IN ('offer_register', 'marketing_register')
      ORDER BY e.created_at DESC
      LIMIT 200`,
    { replacements: { ids: propertyIds } },
  );
  const asObject = (v) => {
    if (v && typeof v === 'object') return v;
    try { return JSON.parse(v || '{}'); } catch { return {}; }
  };
  for (const r of rows) {
    const row = { id: r.id, property_id: r.property_id, ...asObject(r.data) };
    if (r.register_key === 'offer_register') out.offers.push(row);
    else out.marketing.push(row);
  }

  out.deals = await PropertyDeal.findAll({
    where: { property_id: propertyIds },
    attributes: ['id', 'deal_code', 'property_id', 'status', 'sale_price', 'commission_amount', 'settlement_date', 'agreement_date'],
    order: [['created_at', 'DESC']],
  });
  return out;
}

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
    const properties = await Property.findAll({
      where: { owner_contact_id: contactId },
      attributes: ['id', 'property_code', 'title', 'status', 'area', 'district', 'category', 'listing_type', 'price', ...RURAL_LAND_ATTRS],
    });
    out.sections.properties = properties;
    out.sections.tenancies = await Tenancy.findAll({ where: { owner_contact_id: contactId }, include: [propLite] });
    const [disb] = await sequelize.query('SELECT * FROM owner_disbursements WHERE owner_contact_id = :c ORDER BY created_at DESC LIMIT 50', { replacements: { c: contactId } });
    out.sections.disbursements = disb;

    /*
     * An owner whose property is listed for SALE is a seller, and the sections
     * above answer with tenancies and disbursements — neither of which they
     * have. They get the sale picture instead: the offers on their land, how far
     * marketing has got, and where the commission stands.
     *
     * This is a condition on listing_type, not a new portal role: the same person
     * may own a rental plot and a plot for sale, and a second role would make them
     * log in twice to see both.
     */
    const forSale = properties.filter((p) => String(p.listing_type) === 'sale').map((p) => p.id);
    if (forSale.length) {
      out.sections.sale = await sellerSections(forSale, contactId);
    }
  } else if (role === 'supplier') {
    const [wos] = await sequelize.query('SELECT id, work_order_code, title, status, scheduled_date, amount FROM work_orders WHERE provider_id = :p ORDER BY created_at DESC LIMIT 100', { replacements: { p: provider.id } });
    out.sections.work_orders = wos;
    out.sections.invoices = await PropertyInvoice.findAll({ where: { provider_id: provider.id, invoice_kind: 'provider' }, order: [['created_at', 'DESC']], limit: 50 });
  }
  res.json({ data: out });
});
