/**
 * seedCustomDesignFitoutCatalogue.js — the Custom Design & Fit-Out price schedule.
 *
 * Source of truth: "Custom Design & Fit-Out Solutions – Customer Service
 * Agreement V0.2", Schedule C. Priced PER PROJECT, so items are quote-based
 * (base_price 0, fee_model 'quote') — the agreed price is set on each quotation
 * / Schedule C. Codes align with CDFS_CODE_TO_SCHEDULE_A in
 * wtCustomerAgreement.service so a priced line auto-ticks its Schedule A group.
 *
 * Idempotent: rewrites the custom_design_fitout_csa vertical each run. Refuses if
 * a priced quotation already references the current codes. Never touches others.
 */
const { Op } = require('sequelize');
const ServiceItem = require('../models/ServiceItem');
const M = require('../models/waterTankOps');

const VERTICAL = 'custom_design_fitout_csa';
const BRANCH_ID = 1;

// [code, name, unit] — grouped by Schedule A group. Prices are quote-based.
const GROUPS = {
  'Design & Planning Services': [
    ['CDFS-101', 'Initial Consultation', 'Service'],
    ['CDFS-102', 'Site Assessment', 'Visit'],
    ['CDFS-103', 'Concept Design', 'Service'],
    ['CDFS-104', 'Space Planning', 'Service'],
    ['CDFS-105', 'Interior Layout Design', 'Service'],
    ['CDFS-106', 'Furniture Layout Planning', 'Service'],
    ['CDFS-107', 'Colour & Material Selection', 'Service'],
    ['CDFS-108', '2D Design Drawings', 'Service'],
    ['CDFS-109', '3D Visualisation', 'Service'],
  ],
  'Fit-Out & Installation': [
    ['CDFS-201', 'Office Fit-Out', 'Project'],
    ['CDFS-202', 'Retail Fit-Out', 'Project'],
    ['CDFS-203', 'Residential Fit-Out', 'Project'],
    ['CDFS-204', 'Commercial Fit-Out', 'Project'],
    ['CDFS-205', 'Carpentry & Joinery', 'Project'],
    ['CDFS-206', 'Ceiling Installation', 'Project'],
    ['CDFS-207', 'Flooring Installation', 'Project'],
    ['CDFS-208', 'Partition & Glass Installation', 'Project'],
    ['CDFS-209', 'Painting & Decoration', 'Project'],
    ['CDFS-210', 'Electrical & Lighting Coordination', 'Project'],
    ['CDFS-211', 'HVAC Coordination', 'Project'],
  ],
  'Furniture & Styling': [
    ['CDFS-301', 'Furniture Procurement', 'Item'],
    ['CDFS-302', 'Custom Furniture', 'Item'],
    ['CDFS-303', 'Decorative Styling', 'Item'],
    ['CDFS-304', 'Window Furnishings', 'Item'],
    ['CDFS-305', 'Signage Installation', 'Item'],
    ['CDFS-306', 'Display & Feature Installations', 'Item'],
    ['CDFS-307', 'Appliance Coordination', 'Item'],
  ],
  'Project Coordination': [
    ['CDFS-401', 'Project Management', 'Project'],
    ['CDFS-402', 'Site Supervision', 'Project'],
    ['CDFS-403', 'Contractor Coordination', 'Project'],
    ['CDFS-404', 'Supplier Coordination', 'Project'],
    ['CDFS-405', 'Installation Supervision', 'Project'],
    ['CDFS-406', 'Practical Completion & Handover', 'Project'],
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
      where: { service_line: 'custom_design_fitout', [Op.or]: like.map((l) => ({ lines: { [Op.like]: l } })) },
    }).catch(() => 0);
    if (used > 0) {
      console.error(`Refusing to reseed: ${used} custom fit-out quotation(s) already reference the current catalogue. Reconcile first.`);
      process.exit(2);
    }
  }
  await ServiceItem.destroy({ where: { vertical: VERTICAL } });
  const data = rows();
  await ServiceItem.bulkCreate(data);
  const byGroup = data.reduce((m, r) => ((m[r.service_group] = (m[r.service_group] || 0) + 1), m), {});
  console.log(`Custom Design & Fit-Out catalogue seeded into ${VERTICAL}: ${data.length} items`, byGroup);
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
