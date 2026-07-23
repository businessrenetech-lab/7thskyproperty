/**
 * publicSales.controller.js — unauthenticated website endpoints for the SALES
 * side. Kept separate from the legacy public.controller so it depends only on
 * live Seventh Sky models.
 */
const sequelize = require('../config/db.config');
const Branch = require('../models/Branch');
const Property = require('../models/Property');
const SalesEnquiry = require('../models/SalesEnquiry');
const { generateCode } = require('../utils/codeGenerator');
const { ensureBuyerContactAndClient } = require('./salesEnquiry.controller');
const { getTableColumns, hasColumn, pickExisting } = require('../utils/schemaSafe');

const getMainBranchId = async () => {
  const columns = await getTableColumns('branches');
  if (!columns) return 1;
  const head = await Branch.findOne({
    where: hasColumn(columns, 'type') ? { type: 'head' } : { id: 1 },
    attributes: pickExisting(columns, ['id']),
    order: [['id', 'ASC']],
  });
  return head?.id || 1;
};

// POST /api/public/sales-enquiries — a buyer enquires on a sale property. Creates
// or links a buyer Contact + Client, then records the enquiry.
exports.submitSalesEnquiry = async (req, res) => {
  try {
    const { name, phone, email, property_id, budget, preferred_area, message, source } = req.body || {};
    if (!name || (!phone && !email)) {
      return res.status(400).json({ message: 'Name and a phone number or email are required.' });
    }
    let property = null;
    if (property_id) {
      property = await Property.findOne({ where: { id: property_id, listing_type: 'sale' } });
    }
    const branchId = property?.branch_id || Number(req.body?.branch_id) || await getMainBranchId();

    const enquiry = await sequelize.transaction(async (tx) => {
      const { contact, client } = await ensureBuyerContactAndClient(
        { branchId, name, phone, email, actorId: null }, tx,
      );
      return SalesEnquiry.create({
        branch_id: branchId,
        enquiry_code: await generateCode(SalesEnquiry, 'enquiry_code', 'SSPC-BEQ-'),
        property_id: property?.id || null,
        contact_id: contact.id,
        client_id: client.id,
        enquirer_name: name,
        phone: phone || null,
        email: email || null,
        source: source || 'website',
        budget: budget || null,
        preferred_area: preferred_area || null,
        message: message || null,
        stage: 'new',
        next_action: 'Contact the buyer',
      }, { transaction: tx });
    });

    res.status(201).json({ message: 'Enquiry received. Our team will contact you shortly.', code: enquiry.enquiry_code });
  } catch (error) {
    console.error('[submitSalesEnquiry]', error.message);
    res.status(500).json({ message: 'Could not submit the enquiry. Please try again.' });
  }
};
