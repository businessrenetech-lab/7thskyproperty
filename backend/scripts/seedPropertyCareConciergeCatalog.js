/**
 * seedPropertyCareConciergeCatalog.js — the Property Care & Concierge price schedule.
 * Source: Customer Service Agreement V0.2 (Schedule A / B, seven service groups) +
 * SOP quotation section (labour, materials, call-out / coordination fees). Prices are
 * NOT supplied, so every item is seeded at 0 — standard prices are entered on the
 * Price Schedule screen and flow into Schedule C + the work order. Service codes are
 * group-prefixed to match PCC_CODE_TO_SCHEDULE_A in wtCustomerAgreement.service.js
 * (PCM / PPR / SPS / SEC / MKT / NRB / CON), LAB- crew labour, MAT-/SUR- materials &
 * surcharges. Idempotent per vertical; never touches other lines.
 */
const { Op } = require('sequelize');
const ServiceItem = require('../models/ServiceItem');
const M = require('../models/waterTankOps');

const VERTICAL = 'property_care_concierge_csa';
const BRANCH_ID = 1;

// [code, name, unit, price, requiresSiteAssessment?]
const SERVICES = [
  // A. Property Care & Maintenance
  ['PCM-001', 'Cleaning Services', 'Visit', 0],
  ['PCM-002', 'Gardening & Landscaping', 'Visit', 0],
  ['PCM-003', 'General Repairs & Maintenance', 'Job', 0],
  ['PCM-004', 'Painting Services', 'Job', 0, true],
  ['PCM-005', 'Minor Renovation Services', 'Job', 0, true],
  ['PCM-006', 'Emergency Assistance', 'Call-Out', 0],
  ['PCM-007', 'Property Inspections', 'Inspection', 0],
  ['PCM-008', 'Utility Bill Assistance', 'Job', 0],
  ['PCM-009', 'Work Progress Reporting', 'Report', 0],
  ['PCM-010', 'Before & After Work Photography', 'Job', 0],
  // B. Property Presentation
  ['PPR-001', 'Property Styling', 'Job', 0, true],
  ['PPR-002', 'Home Staging', 'Job', 0, true],
  ['PPR-003', 'Furnishing Assistance', 'Job', 0],
  ['PPR-004', 'Seasonal Property Preparation', 'Job', 0],
  ['PPR-005', 'Property Readiness', 'Job', 0],
  // C. Smart Property Solutions
  ['SPS-001', 'CCTV Installation', 'Job', 0, true],
  ['SPS-002', 'Smart Lock Installation', 'Unit', 0],
  ['SPS-003', 'Smart Home Devices', 'Unit', 0],
  ['SPS-004', 'Access Control Systems', 'Job', 0, true],
  ['SPS-005', 'Remote Property Monitoring', 'Month', 0],
  // D. Security & Monitoring
  ['SEC-001', 'Vacant Property Checks', 'Visit', 0],
  ['SEC-002', 'Property Monitoring', 'Month', 0],
  ['SEC-003', 'Emergency Property Response', 'Call-Out', 0],
  ['SEC-004', 'Security Patrol Services', 'Visit', 0],
  // E. Property Marketing Support
  ['MKT-001', 'Professional Photography', 'Job', 0],
  ['MKT-002', 'Videography', 'Job', 0],
  ['MKT-003', 'Drone Photography', 'Job', 0],
  ['MKT-004', 'Listing Preparation', 'Job', 0],
  ['MKT-005', 'Social Media Promotion', 'Campaign', 0],
  // F. NRB Property Services
  ['NRB-001', 'Overseas Owner Reporting', 'Report', 0],
  ['NRB-002', 'Remote Property Monitoring (NRB)', 'Month', 0],
  ['NRB-003', 'Periodic Video Inspection Reports', 'Report', 0],
  ['NRB-004', 'Property Visit Reports', 'Report', 0],
  ['NRB-005', 'Property Care While Owner is Overseas', 'Month', 0],
  // G. Concierge Services
  ['CON-001', 'Mail Collection', 'Month', 0],
  ['CON-002', 'Key Holding', 'Month', 0],
  ['CON-003', 'Property Opening & Closing', 'Visit', 0],
  ['CON-004', 'Appointment Coordination', 'Job', 0],
  ['CON-005', 'Utility Connection Assistance', 'Job', 0],
  ['CON-006', 'Property Preparation Before Arrival', 'Job', 0],
];

// Crew labour (SOP quotation "Labour") — labour group.
const LABOUR = [
  ['LAB-001', 'Supervisor', 'Hour', 0],
  ['LAB-002', 'Technician', 'Hour', 0],
  ['LAB-003', 'Cleaner', 'Hour', 0],
  ['LAB-004', 'Gardener', 'Hour', 0],
  ['LAB-005', 'Inspector', 'Hour', 0],
  ['LAB-006', 'Security Officer', 'Hour', 0],
  ['LAB-007', 'Handyman', 'Hour', 0],
  ['LAB-008', 'Overtime Labour', 'Hour', 0],
];

// Materials, consumables and surcharges — material group.
const MATERIAL = [
  ['MAT-001', 'Cleaning Consumables', 'Set', 0],
  ['MAT-002', 'Garden Supplies', 'Set', 0],
  ['MAT-003', 'Paint & Sundries', 'Set', 0],
  ['MAT-004', 'Repair Materials', 'Set', 0],
  ['MAT-005', 'Fixtures & Fittings', 'Unit', 0],
  ['MAT-006', 'Smart Device / Hardware', 'Unit', 0],
  ['SUR-001', 'Service Call-Out Fee', 'Job', 0],
  ['SUR-002', 'Vehicle / Transport', 'Trip', 0],
  ['SUR-003', 'Waste Disposal', 'Load', 0],
  ['SUR-004', 'Permit / Government Charge', 'Job', 0],
  ['SUR-005', 'Coordination Fee', 'Job', 0],
  ['SUR-006', 'After-Hours Surcharge', 'Job', 0],
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
      where: { service_line: 'property_care_concierge', [Op.or]: like.map((l) => ({ lines: { [Op.like]: l } })) },
    }).catch(() => 0);
    if (used > 0) {
      console.error(`Refusing to reseed: ${used} Property Care quotation(s) already reference the current catalogue. Reconcile first.`);
      process.exit(2);
    }
  }
  await ServiceItem.destroy({ where: { vertical: VERTICAL } });
  const data = rows();
  await ServiceItem.bulkCreate(data);
  const byGroup = data.reduce((m, r) => ((m[r.service_group] = (m[r.service_group] || 0) + 1), m), {});
  console.log(`Property Care & Concierge catalogue seeded into ${VERTICAL}: ${data.length} items`, byGroup);
  console.log('All prices are 0 — set standard prices on the Price Schedule screen; they flow into Schedule C and work orders.');
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
