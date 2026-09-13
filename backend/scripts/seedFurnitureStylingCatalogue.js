/**
 * seedFurnitureStylingCatalogue.js — the Furniture & Styling Consultation price
 * schedule.
 *
 * Source of truth: "Furniture & Styling Consultation – Customer Service
 * Agreement V0.2", Schedule C. Priced PER PROJECT, so items are quote-based
 * (base_price 0, fee_model 'quote') — the agreed price is set on each quotation
 * / Schedule C. Codes align with FSCS_CODE_TO_SCHEDULE_A in
 * wtCustomerAgreement.service so a priced line auto-ticks its Schedule A group.
 *
 * Idempotent: rewrites the furniture_styling_consultation_csa vertical each run.
 * Refuses if a priced quotation already references the current codes. Never
 * touches other verticals.
 */
const { Op } = require('sequelize');
const ServiceItem = require('../models/ServiceItem');
const M = require('../models/waterTankOps');

const VERTICAL = 'furniture_styling_consultation_csa';
const BRANCH_ID = 1;

// [code, name, unit] — grouped by Schedule A group. Prices are quote-based.
const GROUPS = {
  'Furniture Consultation': [
    ['FSCS-101', 'Initial Consultation', 'Service'],
    ['FSCS-102', 'Site Assessment', 'Visit'],
    ['FSCS-103', 'Residential Furniture Consultation', 'Service'],
    ['FSCS-104', 'Commercial Furniture Consultation', 'Service'],
    ['FSCS-105', 'Office Furniture Planning', 'Service'],
    ['FSCS-106', 'Furniture Layout Planning', 'Service'],
    ['FSCS-107', 'Space Optimisation', 'Service'],
    ['FSCS-108', 'Custom Furniture Consultation', 'Service'],
  ],
  'Interior Styling': [
    ['FSCS-201', 'Residential Styling', 'Service'],
    ['FSCS-202', 'Commercial Styling', 'Service'],
    ['FSCS-203', 'Decorative Styling', 'Service'],
    ['FSCS-204', 'Colour Consultation', 'Service'],
    ['FSCS-205', 'Soft Furnishing Selection', 'Service'],
    ['FSCS-206', 'Window Furnishing Consultation', 'Service'],
    ['FSCS-207', 'Artwork & Decorative Item Selection', 'Service'],
    ['FSCS-208', 'Display & Feature Styling', 'Service'],
  ],
  'Furniture Procurement & Coordination': [
    ['FSCS-301', 'Furniture Sourcing Coordination', 'Service'],
    ['FSCS-302', 'Furniture Procurement', 'Item'],
    ['FSCS-303', 'Custom Furniture Coordination', 'Item'],
    ['FSCS-304', 'Decorative Item Procurement', 'Item'],
    ['FSCS-305', 'Furniture Delivery Coordination', 'Service'],
    ['FSCS-306', 'Installation Coordination', 'Service'],
    ['FSCS-307', 'Styling Setup Coordination', 'Service'],
    ['FSCS-308', 'Final Presentation Coordination', 'Service'],
  ],
  'Project Coordination': [
    ['FSCS-401', 'Project Management', 'Project'],
    ['FSCS-402', 'Site Supervision', 'Project'],
    ['FSCS-403', 'Supplier Coordination', 'Project'],
    ['FSCS-404', 'Budget Planning', 'Service'],
    ['FSCS-405', 'Installation Supervision', 'Project'],
    ['FSCS-406', 'Practical Completion & Handover', 'Project'],
  ],
};

function rows() {
  const out = [];
  let sort = 0;
  for (const [group, items] of Object.entries(GROUPS)) {
    for (const [code, name, unit] of items) {
      out.push({
        branch_id: BRANCH_ID, vertical: VERTICAL, code, name, unit,
        base_price: 0, fee_model: 'quote', service_group: group, tags: { group },
        delivery_mode: 'internal', requires_site_assessment: false,
        is_active: true, sort_order: (sort += 10),
      });
    }
  }
  return out;
}

async function run() {
  const existing = await ServiceItem.findAll({ where: { vertical: VERTICAL }, attributes: ['code'], raw: true });
  const codes = existing.map((r) => r.code);
  if (codes.length) {
    const like = codes.map((c) => `%"${c}"%`);
    const used = await M.WtQuotation.count({
      where: { service_line: 'furniture_styling_consultation', [Op.or]: like.map((l) => ({ lines: { [Op.like]: l } })) },
    }).catch(() => 0);
    if (used > 0) {
      console.error(`Refusing to reseed: ${used} furniture & styling quotation(s) already reference the current catalogue. Reconcile first.`);
      process.exit(2);
    }
  }
  await ServiceItem.destroy({ where: { vertical: VERTICAL } });
  const data = rows();
  await ServiceItem.bulkCreate(data);
  const byGroup = data.reduce((m, r) => ((m[r.service_group] = (m[r.service_group] || 0) + 1), m), {});
  console.log(`Furniture & Styling Consultation catalogue seeded into ${VERTICAL}: ${data.length} items`, byGroup);
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
