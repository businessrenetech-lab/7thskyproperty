/**
 * seedSpacePlanningCatalogue.js — the Space Planning & Renovation price schedule.
 *
 * Source of truth: "Space Planning Renovation – Customer Service Agreement V0.2",
 * Schedule C. Priced PER PROJECT, so items are quote-based (base_price 0,
 * fee_model 'quote') — the agreed price is set on each quotation / Schedule C.
 * Codes align with SPRS_CODE_TO_SCHEDULE_A in wtCustomerAgreement.service so a
 * priced line auto-ticks its Schedule A group.
 *
 * Idempotent: rewrites the space_planning_renovation_csa vertical each run.
 * Refuses if a priced quotation already references the current codes. Never
 * touches other verticals.
 */
const { Op } = require('sequelize');
const ServiceItem = require('../models/ServiceItem');
const M = require('../models/waterTankOps');

const VERTICAL = 'space_planning_renovation_csa';
const BRANCH_ID = 1;

// [code, name, unit] — grouped by Schedule A group. Prices are quote-based.
const GROUPS = {
  'Space Planning & Design': [
    ['SPRS-101', 'Initial Consultation', 'Service'],
    ['SPRS-102', 'Site Assessment', 'Visit'],
    ['SPRS-103', 'Space Planning', 'Service'],
    ['SPRS-104', 'Layout Planning', 'Service'],
    ['SPRS-105', 'Functional Flow Planning', 'Service'],
    ['SPRS-106', 'Space Optimisation', 'Service'],
    ['SPRS-107', 'Furniture Layout Planning', 'Service'],
    ['SPRS-108', 'Storage Planning', 'Service'],
    ['SPRS-109', 'Lighting Layout Planning', 'Service'],
    ['SPRS-110', '2D Design Drawings', 'Service'],
    ['SPRS-111', '3D Visualisation', 'Service'],
  ],
  'Renovation & Fit-Out': [
    ['SPRS-201', 'Interior Renovation', 'Project'],
    ['SPRS-202', 'Office Renovation', 'Project'],
    ['SPRS-203', 'Commercial Fit-Out', 'Project'],
    ['SPRS-204', 'Carpentry & Joinery', 'Project'],
    ['SPRS-205', 'Partition Installation', 'Project'],
    ['SPRS-206', 'Ceiling Installation', 'Project'],
    ['SPRS-207', 'Flooring Installation', 'Project'],
    ['SPRS-208', 'Painting & Decoration', 'Project'],
    ['SPRS-209', 'Glass & Aluminium Works', 'Project'],
    ['SPRS-210', 'Electrical Coordination', 'Project'],
    ['SPRS-211', 'Plumbing Coordination', 'Project'],
    ['SPRS-212', 'Built-in Cabinetry', 'Project'],
  ],
  'Furniture & Interior Solutions': [
    ['SPRS-301', 'Furniture Consultation', 'Service'],
    ['SPRS-302', 'Furniture Procurement Coordination', 'Item'],
    ['SPRS-303', 'Modular Furniture', 'Item'],
    ['SPRS-304', 'Appliance Coordination', 'Item'],
    ['SPRS-305', 'Decorative Item Coordination', 'Item'],
    ['SPRS-306', 'Window Furnishing Coordination', 'Item'],
    ['SPRS-307', 'Interior Styling', 'Service'],
  ],
  'Project Coordination': [
    ['SPRS-401', 'Project Management', 'Project'],
    ['SPRS-402', 'Site Supervision', 'Project'],
    ['SPRS-403', 'Contractor Coordination', 'Project'],
    ['SPRS-404', 'Supplier Coordination', 'Project'],
    ['SPRS-405', 'Installation Supervision', 'Project'],
    ['SPRS-406', 'Practical Completion & Handover', 'Project'],
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
      where: { service_line: 'space_planning_renovation', [Op.or]: like.map((l) => ({ lines: { [Op.like]: l } })) },
    }).catch(() => 0);
    if (used > 0) {
      console.error(`Refusing to reseed: ${used} space planning quotation(s) already reference the current catalogue. Reconcile first.`);
      process.exit(2);
    }
  }
  await ServiceItem.destroy({ where: { vertical: VERTICAL } });
  const data = rows();
  await ServiceItem.bulkCreate(data);
  const byGroup = data.reduce((m, r) => ((m[r.service_group] = (m[r.service_group] || 0) + 1), m), {});
  console.log(`Space Planning & Renovation catalogue seeded into ${VERTICAL}: ${data.length} items`, byGroup);
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
