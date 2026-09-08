/**
 * seedRemovalRelocationCatalog.js — the Removal & Relocation price schedule.
 * Source: Customer Service Agreement V0.2 (Schedule A) + SOP quotation section
 * (labour, vehicle, materials, additional services, coordination fee). Prices are
 * NOT supplied, so every item is seeded at 0 — standard prices are entered on the
 * Price Schedule screen and flow into Schedule C + the work order. Codes: REM-
 * relocation services (service group), LAB- crew labour (labour group), MAT-/VEH-
 * / surcharges (material group). Idempotent per vertical; never touches others.
 */
const { Op } = require('sequelize');
const ServiceItem = require('../models/ServiceItem');
const M = require('../models/waterTankOps');

const VERTICAL = 'removal_relocation_csa';
const BRANCH_ID = 1;

// [code, name, unit, price, requiresSiteAssessment?] (sa = large/commercial moves need a site inspection first)
const SERVICES = [
  // Residential Relocation
  ['REM-001', 'Studio Apartment Move', 'Move', 0],
  ['REM-002', '1 Bedroom Move', 'Move', 0],
  ['REM-003', '2 Bedroom Move', 'Move', 0, true],
  ['REM-004', '3 Bedroom Move', 'Move', 0, true],
  ['REM-005', '4 Bedroom+ Move', 'Move', 0, true],
  // Commercial Relocation
  ['REM-006', 'Office Relocation', 'Move', 0, true],
  ['REM-007', 'Retail Shop Relocation', 'Move', 0, true],
  ['REM-008', 'Warehouse Relocation', 'Move', 0, true],
  ['REM-009', 'Business Relocation', 'Move', 0, true],
  // Packing Services
  ['REM-010', 'Packing', 'Job', 0],
  ['REM-011', 'Unpacking', 'Job', 0],
  ['REM-012', 'Fragile Item Packing', 'Job', 0],
  ['REM-013', 'Furniture Wrapping', 'Item', 0],
  ['REM-014', 'Carton Supply', 'Set', 0],
  // Furniture Services
  ['REM-015', 'Furniture Moving', 'Item', 0],
  ['REM-016', 'Furniture Dismantling', 'Item', 0],
  ['REM-017', 'Furniture Reassembly', 'Item', 0],
  ['REM-018', 'Heavy Item Moving', 'Item', 0],
  // Clearance & Disposal
  ['REM-019', 'Household Clearance', 'Job', 0],
  ['REM-020', 'Office Clearance', 'Job', 0],
  ['REM-021', 'Furniture Disposal', 'Item', 0],
  ['REM-022', 'General Waste Removal', 'Load', 0],
  // Move Support
  ['REM-023', 'Move-In Support', 'Job', 0],
  ['REM-024', 'Move-Out Support', 'Job', 0],
  ['REM-025', 'Utility Coordination', 'Job', 0],
  ['REM-026', 'Address Change Assistance', 'Job', 0],
  // Other
  ['REM-027', 'Temporary Storage Coordination', 'Month', 0],
  ['REM-028', 'Labour Only', 'Job', 0],
  ['REM-029', 'Vehicle Only', 'Trip', 0],
  ['REM-030', 'Emergency Relocation', 'Move', 0],
];

// Crew labour (SOP quotation "Labour") — labour group.
const LABOUR = [
  ['LAB-001', 'Team Leader', 'Hour', 0],
  ['LAB-002', 'Mover', 'Hour', 0],
  ['LAB-003', 'Packer', 'Hour', 0],
  ['LAB-004', 'Driver', 'Hour', 0],
  ['LAB-005', 'Overtime Labour', 'Hour', 0],
];

// Vehicles, materials and surcharges — material group.
const MATERIAL = [
  ['VEH-001', 'Truck (Large)', 'Trip', 0],
  ['VEH-002', 'Truck (Medium)', 'Trip', 0],
  ['VEH-003', 'Van', 'Trip', 0],
  ['VEH-004', 'Pickup', 'Trip', 0],
  ['MAT-001', 'Carton (Box)', 'Unit', 0],
  ['MAT-002', 'Bubble Wrap', 'Roll', 0],
  ['MAT-003', 'Protective Cover', 'Unit', 0],
  ['MAT-004', 'Furniture Blanket', 'Unit', 0],
  ['MAT-005', 'Tape & Consumables', 'Set', 0],
  ['SUR-001', 'Waiting Time', 'Hour', 0],
  ['SUR-002', 'Stair Carry', 'Flight', 0],
  ['SUR-003', 'Long Carry Distance', 'Job', 0],
  ['SUR-004', 'Tolls / Parking', 'Job', 0],
  ['SUR-005', 'Coordination Fee', 'Job', 0],
  ['SUR-006', 'Customer Delay Charge', 'Hour', 0],
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
  LABOUR.forEach(push('labour'));
  MATERIAL.forEach(push('material'));
  return out;
}

async function run() {
  const existing = await ServiceItem.findAll({ where: { vertical: VERTICAL }, attributes: ['code'], raw: true });
  const codes = existing.map((r) => r.code);
  if (codes.length) {
    const like = codes.map((c) => `%"${c}"%`);
    const used = await M.WtQuotation.count({
      where: { service_line: 'removal_relocation', [Op.or]: like.map((l) => ({ lines: { [Op.like]: l } })) },
    }).catch(() => 0);
    if (used > 0) {
      console.error(`Refusing to reseed: ${used} Removal quotation(s) already reference the current catalogue. Reconcile first.`);
      process.exit(2);
    }
  }
  await ServiceItem.destroy({ where: { vertical: VERTICAL } });
  const data = rows();
  await ServiceItem.bulkCreate(data);
  const byGroup = data.reduce((m, r) => ((m[r.service_group] = (m[r.service_group] || 0) + 1), m), {});
  console.log(`Removal & Relocation catalogue seeded into ${VERTICAL}: ${data.length} items`, byGroup);
  console.log('All prices are 0 — set standard prices on the Price Schedule screen; they flow into Schedule C and work orders.');
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
