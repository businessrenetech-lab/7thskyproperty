/**
 * seedFitnessRoomCatalogue.js — the Fitness Room Interior Design price schedule.
 *
 * Source of truth: "Fitness Room Interior Design Solutions – Customer Service
 * Agreement V0.2", Schedule C (Professional Services / Fit-Out & Installation /
 * Equipment & Furniture / Project Coordination). Fitness work is priced PER
 * PROJECT, so items are quote-based (base_price 0, fee_model 'quote') — the
 * agreed price is set on each quotation / Schedule C. Codes align with
 * FRIDS_CODE_TO_SCHEDULE_A in wtCustomerAgreement.service so a priced line
 * auto-ticks its Schedule A group.
 *
 * Idempotent: rewrites the fitness_room_interior_design_csa vertical each run.
 * Refuses if a priced fitness quotation already references the current codes.
 * Never touches other verticals.
 */
const { Op } = require('sequelize');
const ServiceItem = require('../models/ServiceItem');
const M = require('../models/waterTankOps');

const VERTICAL = 'fitness_room_interior_design_csa';
const BRANCH_ID = 1;

// [code, name, unit] — grouped by Schedule A group. Prices are quote-based.
const GROUPS = {
  'Fitness Room Design & Planning': [
    ['FRIDS-101', 'Initial Consultation', 'Service'],
    ['FRIDS-102', 'Site Assessment', 'Visit'],
    ['FRIDS-103', 'Fitness Room Design & Planning', 'Service'],
    ['FRIDS-104', 'Fitness Space Planning', 'Service'],
    ['FRIDS-105', 'Equipment Layout Planning', 'Service'],
    ['FRIDS-106', 'Functional Traffic Flow Planning', 'Service'],
    ['FRIDS-107', 'Concept Design', 'Service'],
    ['FRIDS-108', '2D Design Drawings', 'Service'],
    ['FRIDS-109', '3D Visualisation', 'Service'],
    ['FRIDS-110', 'Lighting Design', 'Service'],
  ],
  'Fit-Out & Installation': [
    ['FRIDS-201', 'Gym Fit-Out', 'Project'],
    ['FRIDS-202', 'Renovation & Remodelling', 'Project'],
    ['FRIDS-203', 'Carpentry & Joinery', 'Project'],
    ['FRIDS-204', 'Flooring Installation', 'Project'],
    ['FRIDS-205', 'Ceiling Installation', 'Project'],
    ['FRIDS-206', 'Glass & Mirror Installation', 'Project'],
    ['FRIDS-207', 'Painting & Decoration', 'Project'],
    ['FRIDS-208', 'Electrical & Lighting', 'Project'],
    ['FRIDS-209', 'HVAC Coordination', 'Project'],
    ['FRIDS-210', 'Acoustic Treatment', 'Project'],
  ],
  'Furniture, Equipment & Styling': [
    ['FRIDS-301', 'Fitness Equipment Procurement Coordination', 'Item'],
    ['FRIDS-302', 'Reception Furniture', 'Item'],
    ['FRIDS-303', 'Storage Systems', 'Item'],
    ['FRIDS-304', 'Locker Installation', 'Item'],
    ['FRIDS-305', 'Wellness & Recovery Area', 'Item'],
    ['FRIDS-306', 'Decorative Items & Styling', 'Item'],
    ['FRIDS-307', 'Branding & Signage', 'Item'],
    ['FRIDS-308', 'Audio-Visual Equipment', 'Item'],
  ],
  'Project Coordination': [
    ['FRIDS-401', 'Project Management', 'Project'],
    ['FRIDS-402', 'Site Supervision', 'Project'],
    ['FRIDS-403', 'Vendor Coordination', 'Project'],
    ['FRIDS-404', 'Procurement Coordination', 'Project'],
    ['FRIDS-405', 'Installation Supervision', 'Project'],
    ['FRIDS-406', 'Practical Completion & Handover', 'Project'],
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
      where: { service_line: 'fitness_room_interior_design', [Op.or]: like.map((l) => ({ lines: { [Op.like]: l } })) },
    }).catch(() => 0);
    if (used > 0) {
      console.error(`Refusing to reseed: ${used} fitness quotation(s) already reference the current catalogue. Reconcile first.`);
      process.exit(2);
    }
  }
  await ServiceItem.destroy({ where: { vertical: VERTICAL } });
  const data = rows();
  await ServiceItem.bulkCreate(data);
  const byGroup = data.reduce((m, r) => ((m[r.service_group] = (m[r.service_group] || 0) + 1), m), {});
  console.log(`Fitness Room Interior Design catalogue seeded into ${VERTICAL}: ${data.length} items`, byGroup);
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
