/**
 * seedCommercialInteriorCatalogue.js — the Commercial Interior Design price
 * schedule.
 *
 * Source of truth: "Commercial Interior Design Solutions – Customer Service
 * Agreement V0.2", Schedule C. Commercial work is priced PER PROJECT, so items
 * are quote-based (base_price 0, fee_model 'quote') — the agreed price is set on
 * each quotation / Schedule C. Codes align with CIDS_CODE_TO_SCHEDULE_A in
 * wtCustomerAgreement.service so a priced line auto-ticks its Schedule A group.
 *
 * Idempotent: rewrites the commercial_interior_design_csa vertical each run.
 * Refuses if a priced commercial quotation already references the current codes.
 * Never touches other verticals.
 */
const { Op } = require('sequelize');
const ServiceItem = require('../models/ServiceItem');
const M = require('../models/waterTankOps');

const VERTICAL = 'commercial_interior_design_csa';
const BRANCH_ID = 1;

// [code, name, unit] — grouped by Schedule A group. Prices are quote-based.
const GROUPS = {
  'Commercial Interior Design': [
    ['CIDS-101', 'Initial Consultation', 'Service'],
    ['CIDS-102', 'Site Assessment', 'Visit'],
    ['CIDS-103', 'Office Interior Design', 'Service'],
    ['CIDS-104', 'Retail Interior Design', 'Service'],
    ['CIDS-105', 'Restaurant & Café Design', 'Service'],
    ['CIDS-106', 'Showroom Design', 'Service'],
    ['CIDS-107', 'Commercial Space Planning', 'Service'],
    ['CIDS-108', 'Workspace Optimisation', 'Service'],
    ['CIDS-109', 'Corporate Branding Integration', 'Service'],
    ['CIDS-110', 'Lighting Design', 'Service'],
    ['CIDS-111', '2D Design Drawings', 'Service'],
    ['CIDS-112', '3D Visualisation', 'Service'],
  ],
  'Fit-Out & Renovation': [
    ['CIDS-201', 'Office Fit-Out', 'Project'],
    ['CIDS-202', 'Retail Fit-Out', 'Project'],
    ['CIDS-203', 'Restaurant Fit-Out', 'Project'],
    ['CIDS-204', 'Commercial Renovation', 'Project'],
    ['CIDS-205', 'Partition & Glass Installation', 'Project'],
    ['CIDS-206', 'Carpentry & Joinery', 'Project'],
    ['CIDS-207', 'Painting & Decoration', 'Project'],
    ['CIDS-208', 'Flooring Installation', 'Project'],
    ['CIDS-209', 'Ceiling Installation', 'Project'],
    ['CIDS-210', 'Electrical & Lighting Coordination', 'Project'],
    ['CIDS-211', 'HVAC Coordination', 'Project'],
  ],
  'Furniture & Styling': [
    ['CIDS-301', 'Furniture Selection & Supply', 'Item'],
    ['CIDS-302', 'Workstations', 'Item'],
    ['CIDS-303', 'Reception Furniture', 'Item'],
    ['CIDS-304', 'Custom Furniture', 'Item'],
    ['CIDS-305', 'Decorative Accessories', 'Item'],
    ['CIDS-306', 'Window Furnishings', 'Item'],
    ['CIDS-307', 'Signage Coordination', 'Item'],
  ],
  'Project Coordination': [
    ['CIDS-401', 'Project Management', 'Project'],
    ['CIDS-402', 'Site Supervision', 'Project'],
    ['CIDS-403', 'Contractor Coordination', 'Project'],
    ['CIDS-404', 'Supplier Coordination', 'Project'],
    ['CIDS-405', 'Material Coordination', 'Project'],
    ['CIDS-406', 'Practical Completion & Handover', 'Project'],
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
      where: { service_line: 'commercial_interior_design', [Op.or]: like.map((l) => ({ lines: { [Op.like]: l } })) },
    }).catch(() => 0);
    if (used > 0) {
      console.error(`Refusing to reseed: ${used} commercial quotation(s) already reference the current catalogue. Reconcile first.`);
      process.exit(2);
    }
  }
  await ServiceItem.destroy({ where: { vertical: VERTICAL } });
  const data = rows();
  await ServiceItem.bulkCreate(data);
  const byGroup = data.reduce((m, r) => ((m[r.service_group] = (m[r.service_group] || 0) + 1), m), {});
  console.log(`Commercial Interior Design catalogue seeded into ${VERTICAL}: ${data.length} items`, byGroup);
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
