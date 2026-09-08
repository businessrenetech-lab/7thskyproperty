/**
 * seedLandPropertyAssessmentCatalog.js — the Survey & Valuation price schedule.
 *
 * Source of truth: "Survey & Valuation Services — Customer Service Agreement V0.2"
 * (Schedule A / Schedule C), the Service Delivery Provider Master Agreement
 * (Schedule B) and the Project Work Order V0.2 (Section 8 A/B/C). The client has
 * NOT supplied prices yet, so every item is seeded at 0 — standard prices are
 * entered on the Price Schedule screen in the console, and then flow into
 * Schedule C of the agreement and the work order. Codes: SVS- services,
 * GOV- and TPC- government & third-party charges (material group), PRO-
 * professional fees (labour group).
 *
 * Idempotent: rewrites the land_property_assessment_csa vertical from this list
 * each run. Never touches water_tank_csa or air_conditioning_csa. Guard: refuses
 * to clear if a priced LPAS quotation already references the current catalogue.
 */
const { Op } = require('sequelize');
const ServiceItem = require('../models/ServiceItem');
const M = require('../models/waterTankOps');

const VERTICAL = 'land_property_assessment_csa';
const BRANCH_ID = 1;

// [code, name, unit, price, requiresSiteAssessment?]
const SERVICES = [
  // Land Survey Services
  ['SVS-001', 'Boundary Survey', 'Property', 0, true],
  ['SVS-002', 'Cadastral Survey', 'Property', 0, true],
  ['SVS-003', 'Topographic Survey', 'Property', 0, true],
  ['SVS-004', 'Contour Survey', 'Property', 0, true],
  ['SVS-005', 'Construction / Engineering Survey', 'Project', 0, true],
  ['SVS-006', 'Subdivision Survey', 'Project', 0, true],
  ['SVS-007', 'GIS / Digital Mapping', 'Project', 0, true],
  ['SVS-008', 'Drone Survey', 'Flight', 0, true],
  ['SVS-009', 'Utility Mapping', 'Project', 0, true],
  // Property Valuation Services
  ['SVS-010', 'Residential Property Valuation', 'Property', 0, true],
  ['SVS-011', 'Commercial Property Valuation', 'Property', 0, true],
  ['SVS-012', 'Industrial Property Valuation', 'Property', 0, true],
  ['SVS-013', 'Agricultural / Land Valuation', 'Property', 0, true],
  ['SVS-014', 'Rental Assessment', 'Property', 0],
  ['SVS-015', 'Insurance Valuation', 'Property', 0, true],
  ['SVS-016', 'Investment / Mortgage Valuation', 'Property', 0, true],
  ['SVS-017', 'Development Site Valuation', 'Property', 0, true],
  // Technical Property Services
  ['SVS-018', 'Property Condition Assessment', 'Property', 0, true],
  ['SVS-019', 'Due Diligence Inspection', 'Property', 0, true],
  ['SVS-020', 'Site Verification', 'Visit', 0],
  ['SVS-021', 'Measurement Verification', 'Property', 0],
  ['SVS-022', 'Technical Property Report', 'Report', 0, true],
  // NRB Property Support Services
  ['SVS-023', 'Remote Property Inspection', 'Visit', 0],
  ['SVS-024', 'Property Verification', 'Property', 0],
  ['SVS-025', 'Video Inspection', 'Visit', 0],
  ['SVS-026', 'Construction Progress Inspection', 'Visit', 0],
  ['SVS-027', 'Ownership Verification Coordination', 'Property', 0],
  // Additional
  ['SVS-028', 'Additional Site Visit', 'Visit', 0],
  ['SVS-029', 'Other Approved Services', 'As Agreed', 0],
];

// Government & third-party charges (Work Order Section 8B) — passed through.
const CHARGES = [
  ['GOV-001', 'Government Search Fees', 'Item', 0],
  ['GOV-002', 'Land Record Collection', 'Item', 0],
  ['GOV-003', 'Certified Copies', 'Item', 0],
  ['GOV-004', 'Registration Office Fees', 'Item', 0],
  ['TPC-001', 'Laboratory Testing', 'Item', 0],
  ['TPC-002', 'Drone Operator', 'Item', 0],
  ['TPC-003', 'External Consultant', 'Item', 0],
  ['TPC-004', 'Courier / Document Delivery', 'Item', 0],
  ['TPC-005', 'Other Approved Costs', 'Item', 0],
];

// Professional fees (Work Order Section 8C).
const PROFESSIONAL = [
  ['PRO-001', 'Licensed Surveyor', 'Hour', 0],
  ['PRO-002', 'Certified Valuer', 'Hour', 0],
  ['PRO-003', 'Civil Engineer', 'Hour', 0],
  ['PRO-004', 'Structural Engineer', 'Hour', 0],
  ['PRO-005', 'Architect', 'Hour', 0],
  ['PRO-006', 'CAD Technician', 'Hour', 0],
  ['PRO-007', 'Survey Assistant', 'Hour', 0],
  ['PRO-008', 'Administration Support', 'Hour', 0],
  ['PRO-009', 'Other Specialist', 'Hour', 0],
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
  CHARGES.forEach(push('material'));
  PROFESSIONAL.forEach(push('labour'));
  return out;
}

async function run() {
  const existing = await ServiceItem.findAll({ where: { vertical: VERTICAL }, attributes: ['code'], raw: true });
  const codes = existing.map((r) => r.code);
  if (codes.length) {
    const like = codes.map((c) => `%"${c}"%`);
    const used = await M.WtQuotation.count({
      where: { service_line: 'land_property_assessment', [Op.or]: like.map((l) => ({ lines: { [Op.like]: l } })) },
    }).catch(() => 0);
    if (used > 0) {
      console.error(`Refusing to reseed: ${used} LPAS quotation(s) already reference the current catalogue. Reconcile first.`);
      process.exit(2);
    }
  }

  await ServiceItem.destroy({ where: { vertical: VERTICAL } });
  const data = rows();
  await ServiceItem.bulkCreate(data);
  const byGroup = data.reduce((m, r) => ((m[r.service_group] = (m[r.service_group] || 0) + 1), m), {});
  console.log(`Land & Property Assessment catalogue seeded into ${VERTICAL}: ${data.length} items`, byGroup);
  console.log('All prices are 0 — set standard prices on the Price Schedule screen; they flow into Schedule C and work orders.');
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
