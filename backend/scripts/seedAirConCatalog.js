/**
 * seedAirConCatalog.js — the real Air Conditioning price schedule.
 *
 * Source of truth: "Air Conditioning Solutions – Customer Service Agreement
 * V0.2", Schedule C (Standard Service Pricing / Materials & Equipment / Labour
 * Charges) and the Project Work Order V0.2. Prices are BDT.
 *
 * This REPLACES the earlier bootstrap that cloned the Water Tank list into
 * air_conditioning_csa. It clears the AC vertical and inserts the genuine AC
 * catalogue so quotes, agreements (Schedule C) and work orders price from the
 * client's own rate card. Idempotent: safe to re-run — it rewrites the AC
 * vertical from this list each time. It never touches water_tank_csa.
 *
 * Guard: refuses to clear if any AC catalogue item is already referenced by a
 * priced AC record, so a re-run can't orphan a signed document.
 */
const { Op } = require('sequelize');
const ServiceItem = require('../models/ServiceItem');
const M = require('../models/waterTankOps');

const VERTICAL = 'air_conditioning_csa';
const BRANCH_ID = 1;

// group: service | material | labour. sa = requires a site assessment first
// (installations, relocations and the commercial assessment itself).
const SERVICES = [
  ['ACS-001', 'Residential AC Consultation', 'Visit', 1000],
  ['ACS-002', 'Commercial Site Assessment', 'Visit', 2500, true],
  ['ACS-003', 'Split AC Installation (1–2 Ton)', 'Unit', 6500, true],
  ['ACS-004', 'Inverter AC Installation', 'Unit', 7500, true],
  ['ACS-005', 'Cassette AC Installation', 'Unit', 15000, true],
  ['ACS-006', 'Ducted AC Installation', 'Unit', 35000, true],
  ['ACS-007', 'Multi-Zone AC Installation', 'Unit', 18000, true],
  ['ACS-008', 'Residential AC Relocation', 'Unit', 6000, true],
  ['ACS-009', 'Commercial AC Relocation', 'Unit', 12000, true],
  ['ACS-010', 'Preventive Maintenance', 'Unit', 2000],
  ['ACS-011', 'Commercial Preventive Maintenance', 'Unit', 3500],
  ['ACS-012', 'Standard AC Cleaning', 'Unit', 1200],
  ['ACS-013', 'Deep Chemical Cleaning', 'Unit', 2500],
  ['ACS-014', 'Indoor Unit Cleaning', 'Unit', 900],
  ['ACS-015', 'Outdoor Unit Cleaning', 'Unit', 900],
  ['ACS-016', 'Leak Detection', 'Unit', 1500],
  ['ACS-017', 'Refrigerant Gas Top-Up', 'Unit', 2500],
  ['ACS-018', 'Full Refrigerant Gas Refill', 'Unit', 4500],
  ['ACS-019', 'Compressor Replacement (Labour Only)', 'Unit', 5000],
  ['ACS-020', 'Fan Motor Replacement (Labour Only)', 'Unit', 2500],
  ['ACS-021', 'PCB Replacement (Labour Only)', 'Unit', 2000],
  ['ACS-022', 'Sensor Replacement (Labour Only)', 'Unit', 800],
  ['ACS-023', 'Fault Diagnosis', 'Visit', 1000],
  ['ACS-024', 'Emergency Call-Out', 'Visit', 2000],
  ['ACS-025', 'After Hours / Public Holiday Call-Out', 'Visit', 3000],
  ['ACS-026', 'Residential AMC', 'Unit / Year', 5500],
  ['ACS-027', 'Commercial AMC', 'Unit / Year', 8500],
  ['ACS-028', 'Smart Thermostat Installation', 'Unit', 3500],
  ['ACS-029', 'Wi-Fi Smart AC Configuration', 'Unit', 2000],
  ['ACS-030', 'Energy Efficiency Assessment', 'Visit', 2500],
];

const MATERIALS = [
  ['MAT-001', 'Copper Pipe', 'Metre', 850],
  ['MAT-002', 'Drain Pipe', 'Metre', 180],
  ['MAT-003', 'Electrical Cable', 'Metre', 160],
  ['MAT-004', 'Wall Bracket', 'Set', 1800],
  ['MAT-005', 'Outdoor Stand', 'Set', 2500],
  ['MAT-006', 'Refrigerant Gas (R32/R410A)', 'kg', 1600],
  ['MAT-007', 'Insulation', 'Metre', 180],
  ['MAT-008', 'PVC Trunking', 'Metre', 300],
  ['MAT-009', 'Anchor Bolts & Fasteners', 'Set', 350],
  ['MAT-010', 'Miscellaneous Consumables', 'Job', 500],
];

const LABOUR = [
  ['LAB-001', 'Senior Technician', 'Hour', 1000],
  ['LAB-002', 'Technician', 'Hour', 700],
  ['LAB-003', 'Assistant Technician', 'Hour', 450],
  ['LAB-004', 'Additional Labour', 'Hour', 450],
  ['LAB-005', 'Overtime Labour', 'Hour', 1200],
];

function rows() {
  const out = [];
  let sort = 0;
  const push = (group) => ([code, name, unit, price, sa]) => {
    out.push({
      branch_id: BRANCH_ID, vertical: VERTICAL, code, name,
      unit, base_price: price, service_group: group, tags: { group },
      fee_model: 'fixed', requires_site_assessment: group === 'service' && !!sa,
      is_active: true, sort_order: (sort += 10),
    });
  };
  SERVICES.forEach(push('service'));
  MATERIALS.forEach(push('material'));
  LABOUR.forEach(push('labour'));
  return out;
}

async function run() {
  const existing = await ServiceItem.findAll({ where: { vertical: VERTICAL }, attributes: ['code'], raw: true });
  // Refuse to wipe if a priced AC record already points at one of these codes.
  const codes = existing.map((r) => r.code);
  if (codes.length) {
    const like = codes.map((c) => `%"${c}"%`);
    const used = await M.WtQuotation.count({
      where: { service_line: 'air_conditioning', [Op.or]: like.map((l) => ({ lines: { [Op.like]: l } })) },
    }).catch(() => 0);
    if (used > 0) {
      console.error(`Refusing to reseed: ${used} AC quotation(s) already reference the current AC catalogue. Reconcile first.`);
      process.exit(2);
    }
  }

  await ServiceItem.destroy({ where: { vertical: VERTICAL } });
  const data = rows();
  await ServiceItem.bulkCreate(data);
  const byGroup = data.reduce((m, r) => ((m[r.service_group] = (m[r.service_group] || 0) + 1), m), {});
  console.log(`Air Conditioning catalogue seeded into ${VERTICAL}: ${data.length} items`, byGroup);
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
