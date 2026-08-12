/**
 * Seed the Water Tank agreement price schedule (Schedule C of the Customer Service
 * Agreement SS-WTCM-CSA-01 and Schedule B of the Provider Master Agreement
 * SSPC-WTCM-SDPMA-01). Both agreements price from the SAME schedule.
 * Seeded into ServiceItem under vertical `water_tank_csa` (WTC/MAT/LAB codes),
 * standard price = base_price. Idempotent by code. Run from backend/:
 *   node scripts/seedWaterTankAgreementCatalog.js
 */
require('dotenv').config();
const ServiceCategory = require('../models/ServiceCategory');
const ServiceItem = require('../models/ServiceItem');

const VERTICAL = 'water_tank_csa';
const BRANCH = 1;

// [code, name, unit, base_price, group]  group: service | material | labour
const ITEMS = [
  ['WTC-001', 'Residential Water Tank Inspection', 'Visit', 800, 'service'],
  ['WTC-002', 'Commercial Water Tank Inspection', 'Visit', 2000, 'service'],
  ['WTC-003', 'Residential Water Tank Cleaning (Up to 1,000L)', 'Tank', 2500, 'service'],
  ['WTC-004', 'Residential Water Tank Cleaning (1,001–2,500L)', 'Tank', 3500, 'service'],
  ['WTC-005', 'Commercial Water Tank Cleaning', 'Tank', 6500, 'service'],
  ['WTC-006', 'Industrial Water Tank Cleaning', 'Tank', 12000, 'service'],
  ['WTC-007', 'Underground Water Tank Cleaning', 'Tank', 7500, 'service'],
  ['WTC-008', 'Overhead Water Tank Cleaning', 'Tank', 4000, 'service'],
  ['WTC-009', 'Water Tank Disinfection', 'Tank', 2000, 'service'],
  ['WTC-010', 'Tank Sterilisation', 'Tank', 2500, 'service'],
  ['WTC-011', 'Bacteria & Algae Treatment', 'Tank', 2800, 'service'],
  ['WTC-012', 'Water Quality Testing', 'Sample', 2500, 'service'],
  ['WTC-013', 'Water Quality Assessment Report', 'Report', 1500, 'service'],
  ['WTC-014', 'Leak Detection', 'Tank', 1800, 'service'],
  ['WTC-015', 'Crack Repair', 'Tank', 4500, 'service'],
  ['WTC-016', 'Waterproofing Treatment', 'Tank', 6000, 'service'],
  ['WTC-017', 'Valve Replacement (Labour Only)', 'Each', 1500, 'service'],
  ['WTC-018', 'Pipe Connection Repair', 'Each', 2000, 'service'],
  ['WTC-019', 'Preventive Maintenance Visit', 'Visit', 2500, 'service'],
  ['WTC-020', 'Scheduled Maintenance', 'Visit', 3500, 'service'],
  ['WTC-021', 'Water Pump Inspection', 'Visit', 1500, 'service'],
  ['WTC-022', 'Water Pump Maintenance', 'Pump', 3000, 'service'],
  ['WTC-023', 'Pressure Testing', 'System', 2500, 'service'],
  ['WTC-024', 'Emergency Call-Out', 'Visit', 3000, 'service'],
  ['WTC-025', 'After Hours / Public Holiday Call-Out', 'Visit', 4000, 'service'],
  ['WTC-026', 'Residential Annual Maintenance Contract', 'Tank / Year', 7500, 'service'],
  ['WTC-027', 'Commercial Annual Maintenance Contract', 'Tank / Year', 15000, 'service'],
  ['WTC-028', 'Industrial Annual Maintenance Contract', 'Tank / Year', 30000, 'service'],
  // Materials & consumables
  ['MAT-001', 'Food Grade Disinfectant', 'Litre', 650, 'material'],
  ['MAT-002', 'Cleaning Chemical', 'Litre', 500, 'material'],
  ['MAT-003', 'Waterproofing Compound', 'kg', 650, 'material'],
  ['MAT-004', 'PVC Valve', 'Each', 800, 'material'],
  ['MAT-005', 'Pipe & Fittings', 'Metre', 450, 'material'],
  ['MAT-006', 'Sealant', 'Tube', 450, 'material'],
  ['MAT-007', 'Replacement Float Valve', 'Each', 1200, 'material'],
  ['MAT-008', 'Miscellaneous Consumables', 'Job', 500, 'material'],
  // Labour charges
  ['LAB-001', 'Senior Technician', 'Hour', 1000, 'labour'],
  ['LAB-002', 'Technician', 'Hour', 700, 'labour'],
  ['LAB-003', 'Assistant Technician', 'Hour', 450, 'labour'],
  ['LAB-004', 'Additional Labour', 'Hour', 450, 'labour'],
  ['LAB-005', 'Overtime Labour', 'Hour', 1200, 'labour'],
];

(async () => {
  const [root] = await ServiceCategory.findOrCreate({
    where: { code: 'SVC-CAT-WTCSA' },
    defaults: { branch_id: BRANCH, vertical: VERTICAL, name: 'Water Tank Cleaning & Maintenance — Agreement Schedule', code: 'SVC-CAT-WTCSA', slug: 'water-tank-csa', icon: 'Droplet', sort_order: 0 },
  });

  let created = 0, updated = 0, sort = 0;
  for (const [code, name, unit, base_price, group] of ITEMS) {
    const tags = { price_type: 'fixed', group, schedule: 'C' };
    const [row, wasCreated] = await ServiceItem.findOrCreate({
      where: { code },
      defaults: {
        branch_id: BRANCH, category_id: root.id, vertical: VERTICAL, name, code,
        service_group: 'water_tank_csa', fee_model: 'fixed', base_price, unit,
        sspc_fee_type: 'fixed', sspc_fee_value: 0, provider_pay_type: 'remainder', provider_pay_value: 0,
        delivery_mode: 'either', applicable_to: ['standalone'], tags,
        is_active: true, sort_order: sort++,
      },
    });
    if (wasCreated) created++;
    else { await row.update({ name, unit, tags, category_id: root.id, vertical: VERTICAL, service_group: 'water_tank_csa', sort_order: sort - 1 }); updated++; }
  }
  console.log(`Water Tank agreement catalog seeded under #${root.id}: created ${created}, updated ${updated} (of ${ITEMS.length}).`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
