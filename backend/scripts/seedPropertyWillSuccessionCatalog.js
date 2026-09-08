/**
 * seedPropertyWillSuccessionCatalog.js — the Property Will & Succession Support
 * price schedule. Source: Customer Service Agreement V0.2 (Schedule A) + Work
 * Order V0.2. Prices are NOT supplied, so every item is seeded at 0 — standard
 * prices are entered on the Price Schedule screen and flow into Schedule C and the
 * work order. Codes: PWS- coordination services (service group), PRO- professional
 * fees (labour group), TPC- government/legal/third-party costs (material group).
 * Idempotent per vertical; never touches other verticals.
 */
const { Op } = require('sequelize');
const ServiceItem = require('../models/ServiceItem');
const M = require('../models/waterTankOps');

const VERTICAL = 'property_will_succession_csa';
const BRANCH_ID = 1;

// [code, name, unit, price, requiresSiteAssessment?] (sa = needs the succession-readiness assessment first)
const SERVICES = [
  // Property Will Documentation Support
  ['PWS-001', 'Property Will Documentation Review', 'Case', 0, true],
  ['PWS-002', 'Property Will Preparation Coordination', 'Case', 0, true],
  ['PWS-003', 'Will Documentation Assistance', 'Case', 0],
  ['PWS-004', 'Witness Coordination', 'Case', 0],
  ['PWS-005', 'Will Registration Coordination', 'Case', 0],
  ['PWS-006', 'Estate Documentation Review', 'Case', 0],
  ['PWS-007', 'Secure Document Storage Coordination', 'Case', 0],
  // Property Ownership Transfer Support
  ['PWS-008', 'Ownership Transfer Documentation Support', 'Case', 0, true],
  ['PWS-009', 'Beneficiary Documentation', 'Case', 0],
  ['PWS-010', 'Property Ownership Transfer Coordination', 'Case', 0, true],
  ['PWS-011', 'Estate Transfer Coordination', 'Case', 0],
  ['PWS-012', 'Succession Documentation Review', 'Case', 0, true],
  ['PWS-013', 'Property Record Verification', 'Case', 0],
  // Property Nomination & Record Support
  ['PWS-014', 'Beneficiary Record Review', 'Case', 0],
  ['PWS-015', 'Nomination Documentation', 'Case', 0],
  ['PWS-016', 'Property Ownership Record Review', 'Case', 0],
  ['PWS-017', 'Family Property Record Coordination', 'Case', 0],
  ['PWS-018', 'Property Portfolio Record Review', 'Case', 0],
  // Legal & Professional Coordination
  ['PWS-019', 'Lawyer Coordination', 'Case', 0],
  ['PWS-020', 'Conveyancer Coordination', 'Case', 0],
  ['PWS-021', 'Probate Practitioner Coordination', 'Case', 0],
  ['PWS-022', 'Estate Administration Coordination', 'Case', 0],
  ['PWS-023', 'Land Registry Coordination', 'Case', 0],
  ['PWS-024', 'Government Authority Liaison', 'Case', 0],
  ['PWS-025', 'Financial Institution Coordination', 'Case', 0],
  // Property Succession Support
  ['PWS-026', 'Succession Planning Coordination', 'Case', 0, true],
  ['PWS-027', 'Family Property Succession Coordination', 'Case', 0],
  ['PWS-028', 'Estate Documentation Coordination', 'Case', 0],
  ['PWS-029', 'Beneficiary Coordination', 'Case', 0],
  ['PWS-030', 'Property Succession Administration Support', 'Case', 0],
  ['PWS-031', 'Property Distribution Coordination', 'Case', 0],
  ['PWS-032', 'NRB Property Succession Support', 'Case', 0],
];

// Professional service fees (Work Order pricing) — labour group.
const PROFESSIONAL = [
  ['PRO-001', 'Consultation Fee', 'Session', 0],
  ['PRO-002', 'Documentation Coordination Fee', 'Case', 0],
  ['PRO-003', 'Succession Coordination Fee', 'Case', 0],
  ['PRO-004', 'Project Management Fee', 'Case', 0],
  ['PRO-005', 'Administration Fee', 'Case', 0],
];

// Government / legal / third-party costs — material group.
const THIRDPARTY = [
  ['TPC-001', 'Government / Registration Fees', 'Item', 0],
  ['TPC-002', 'Court Fees', 'Item', 0],
  ['TPC-003', 'Legal Fees', 'Item', 0],
  ['TPC-004', 'Certified Copies', 'Item', 0],
  ['TPC-005', 'Courier / Documentation', 'Item', 0],
  ['TPC-006', 'Other Approved Cost', 'Item', 0],
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
  PROFESSIONAL.forEach(push('labour'));
  THIRDPARTY.forEach(push('material'));
  return out;
}

async function run() {
  const existing = await ServiceItem.findAll({ where: { vertical: VERTICAL }, attributes: ['code'], raw: true });
  const codes = existing.map((r) => r.code);
  if (codes.length) {
    const like = codes.map((c) => `%"${c}"%`);
    const used = await M.WtQuotation.count({
      where: { service_line: 'property_will_succession', [Op.or]: like.map((l) => ({ lines: { [Op.like]: l } })) },
    }).catch(() => 0);
    if (used > 0) {
      console.error(`Refusing to reseed: ${used} PWS quotation(s) already reference the current catalogue. Reconcile first.`);
      process.exit(2);
    }
  }
  await ServiceItem.destroy({ where: { vertical: VERTICAL } });
  const data = rows();
  await ServiceItem.bulkCreate(data);
  const byGroup = data.reduce((m, r) => ((m[r.service_group] = (m[r.service_group] || 0) + 1), m), {});
  console.log(`Property Will & Succession catalogue seeded into ${VERTICAL}: ${data.length} items`, byGroup);
  console.log('All prices are 0 — set standard prices on the Price Schedule screen; they flow into Schedule C and work orders.');
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
