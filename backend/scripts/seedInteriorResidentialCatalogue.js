/**
 * seedInteriorResidentialCatalogue.js — the Residential Interior Design price
 * schedule.
 *
 * Source of truth: "Residential Interior Design Solutions – Customer Service
 * Agreement V0.2", Schedule C (Professional Services / Renovation & Fit-Out /
 * Furniture & Styling / Project Coordination). Interior work is priced PER
 * PROJECT, so items are quote-based (base_price 0, fee_model 'quote') — the
 * agreed price is set on each quotation / Schedule C. Codes align with
 * RIDS_CODE_TO_SCHEDULE_A in wtCustomerAgreement.service so a priced line
 * auto-ticks its Schedule A group.
 *
 * Idempotent: rewrites the residential_interior_design_csa vertical each run.
 * Refuses if a priced interior record already references the current codes.
 * Never touches other verticals.
 */
const { Op } = require('sequelize');
const ServiceItem = require('../models/ServiceItem');
const M = require('../models/waterTankOps');

const VERTICAL = 'residential_interior_design_csa';
const BRANCH_ID = 1;

// [code, name, unit] — grouped by Schedule A group. Prices are quote-based.
const GROUPS = {
  'Interior Design & Planning': [
    ['RIDS-101', 'Initial Consultation', 'Service'],
    ['RIDS-102', 'Site Assessment', 'Visit'],
    ['RIDS-103', 'Interior Design Consultation', 'Service'],
    ['RIDS-104', 'Space Planning', 'Service'],
    ['RIDS-105', 'Colour Consultation', 'Service'],
    ['RIDS-106', 'Material & Finish Selection', 'Service'],
    ['RIDS-107', '2D Design Drawings', 'Service'],
    ['RIDS-108', '3D Visualisation', 'Service'],
    ['RIDS-109', 'Lighting Design', 'Service'],
    ['RIDS-110', 'Kitchen / Bathroom Design', 'Service'],
  ],
  'Renovation & Fit-Out': [
    ['RIDS-201', 'Interior Renovation', 'Project'],
    ['RIDS-202', 'Carpentry & Joinery', 'Project'],
    ['RIDS-203', 'Painting & Decoration', 'Project'],
    ['RIDS-204', 'Flooring Installation', 'Project'],
    ['RIDS-205', 'Ceiling Installation', 'Project'],
    ['RIDS-206', 'Electrical & Lighting Coordination', 'Project'],
    ['RIDS-207', 'Plumbing Coordination', 'Project'],
    ['RIDS-208', 'Kitchen Fit-Out', 'Project'],
    ['RIDS-209', 'Bathroom Fit-Out', 'Project'],
    ['RIDS-210', 'Built-in Cabinetry', 'Project'],
    ['RIDS-211', 'Wardrobes', 'Project'],
    ['RIDS-212', 'Glass & Partition Installation', 'Project'],
  ],
  'Furniture & Styling': [
    ['RIDS-301', 'Furniture Supply & Placement', 'Item'],
    ['RIDS-302', 'Decorative Items', 'Item'],
    ['RIDS-303', 'Curtains & Window Furnishings', 'Item'],
    ['RIDS-304', 'Soft Furnishings', 'Item'],
    ['RIDS-305', 'Artwork & Wall Décor', 'Item'],
    ['RIDS-306', 'Home Accessories', 'Item'],
    ['RIDS-307', 'Appliance Coordination', 'Item'],
    ['RIDS-308', 'Indoor Plants', 'Item'],
  ],
  'Project Coordination': [
    ['RIDS-401', 'Project Management', 'Project'],
    ['RIDS-402', 'Site Supervision', 'Project'],
    ['RIDS-403', 'Vendor Coordination', 'Project'],
    ['RIDS-404', 'Procurement Coordination', 'Project'],
    ['RIDS-405', 'Installation Management', 'Project'],
    ['RIDS-406', 'Practical Completion & Handover', 'Project'],
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
      where: { service_line: 'residential_interior_design', [Op.or]: like.map((l) => ({ lines: { [Op.like]: l } })) },
    }).catch(() => 0);
    if (used > 0) {
      console.error(`Refusing to reseed: ${used} interior quotation(s) already reference the current catalogue. Reconcile first.`);
      process.exit(2);
    }
  }
  await ServiceItem.destroy({ where: { vertical: VERTICAL } });
  const data = rows();
  await ServiceItem.bulkCreate(data);
  const byGroup = data.reduce((m, r) => ((m[r.service_group] = (m[r.service_group] || 0) + 1), m), {});
  console.log(`Residential Interior Design catalogue seeded into ${VERTICAL}: ${data.length} items`, byGroup);
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
