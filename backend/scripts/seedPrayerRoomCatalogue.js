/**
 * seedPrayerRoomCatalogue.js — the Muslim Prayer Room Interior Design price
 * schedule.
 *
 * Source of truth: "Muslim Prayer Room IDS – Customer Service Agreement V0.2",
 * Schedule C. Priced PER PROJECT, so items are quote-based (base_price 0,
 * fee_model 'quote') — the agreed price is set on each quotation / Schedule C.
 * Codes align with MPRIDS_CODE_TO_SCHEDULE_A in wtCustomerAgreement.service so a
 * priced line auto-ticks its Schedule A group.
 *
 * Idempotent: rewrites the prayer_room_interior_design_csa vertical each run.
 * Refuses if a priced quotation already references the current codes. Never
 * touches other verticals.
 */
const { Op } = require('sequelize');
const ServiceItem = require('../models/ServiceItem');
const M = require('../models/waterTankOps');

const VERTICAL = 'prayer_room_interior_design_csa';
const BRANCH_ID = 1;

// [code, name, unit] — grouped by Schedule A group. Prices are quote-based.
const GROUPS = {
  'Prayer Room Design & Planning': [
    ['MPRIDS-101', 'Initial Consultation', 'Service'],
    ['MPRIDS-102', 'Site Assessment', 'Visit'],
    ['MPRIDS-103', 'Prayer Room Space Planning', 'Service'],
    ['MPRIDS-104', 'Musallah Layout Design', 'Service'],
    ['MPRIDS-105', 'Qibla Orientation Planning', 'Service'],
    ['MPRIDS-106', 'Prayer Capacity Planning', 'Service'],
    ['MPRIDS-107', 'Wudu Area Planning', 'Service'],
    ['MPRIDS-108', 'Accessibility Planning', 'Service'],
    ['MPRIDS-109', '2D Design Drawings', 'Service'],
    ['MPRIDS-110', '3D Visualisation', 'Service'],
  ],
  'Interior Fit-Out & Renovation': [
    ['MPRIDS-201', 'Prayer Room Fit-Out', 'Project'],
    ['MPRIDS-202', 'Renovation & Refurbishment', 'Project'],
    ['MPRIDS-203', 'Carpentry & Joinery', 'Project'],
    ['MPRIDS-204', 'Flooring Installation', 'Project'],
    ['MPRIDS-205', 'Prayer Carpet Supply & Installation', 'Project'],
    ['MPRIDS-206', 'Ceiling Installation', 'Project'],
    ['MPRIDS-207', 'Painting & Decoration', 'Project'],
    ['MPRIDS-208', 'Glass & Partition Installation', 'Project'],
    ['MPRIDS-209', 'Electrical & Lighting Coordination', 'Project'],
    ['MPRIDS-210', 'Plumbing Coordination for Wudu Facilities', 'Project'],
  ],
  'Furniture, Décor & Equipment': [
    ['MPRIDS-301', 'Islamic Décor Consultation', 'Service'],
    ['MPRIDS-302', 'Furniture Coordination', 'Item'],
    ['MPRIDS-303', 'Shoe Rack Design & Installation', 'Item'],
    ["MPRIDS-304", "Qur'an Storage Solutions", 'Item'],
    ['MPRIDS-305', 'Shelving & Storage Solutions', 'Item'],
    ['MPRIDS-306', 'Audio System Coordination', 'Item'],
    ['MPRIDS-307', 'Digital Prayer Time Display Coordination', 'Item'],
    ['MPRIDS-308', 'Signage & Wayfinding Coordination', 'Item'],
  ],
  'Project Coordination': [
    ['MPRIDS-401', 'Project Management', 'Project'],
    ['MPRIDS-402', 'Site Supervision', 'Project'],
    ['MPRIDS-403', 'Contractor Coordination', 'Project'],
    ['MPRIDS-404', 'Supplier Coordination', 'Project'],
    ['MPRIDS-405', 'Installation Supervision', 'Project'],
    ['MPRIDS-406', 'Practical Completion & Handover', 'Project'],
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
      where: { service_line: 'prayer_room_interior_design', [Op.or]: like.map((l) => ({ lines: { [Op.like]: l } })) },
    }).catch(() => 0);
    if (used > 0) {
      console.error(`Refusing to reseed: ${used} prayer room quotation(s) already reference the current catalogue. Reconcile first.`);
      process.exit(2);
    }
  }
  await ServiceItem.destroy({ where: { vertical: VERTICAL } });
  const data = rows();
  await ServiceItem.bulkCreate(data);
  const byGroup = data.reduce((m, r) => ((m[r.service_group] = (m[r.service_group] || 0) + 1), m), {});
  console.log(`Muslim Prayer Room Interior Design catalogue seeded into ${VERTICAL}: ${data.length} items`, byGroup);
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
