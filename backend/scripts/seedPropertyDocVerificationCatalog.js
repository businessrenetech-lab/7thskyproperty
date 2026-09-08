/**
 * seedPropertyDocVerificationCatalog.js — the Property Documentation & Verification
 * price schedule. Source: Customer Service Agreement V0.2 (Schedule A) + Work Order
 * V0.2 (Section 7 Pricing). Prices are NOT supplied, so every item is seeded at 0 —
 * standard prices are entered on the Price Schedule screen and flow into Schedule C
 * and the work order. Codes: PDV- coordination/verification services (service
 * group), PRO- professional fees (labour group), TPC- government/third-party costs
 * (material group). Idempotent per vertical; never touches other verticals.
 */
const { Op } = require('sequelize');
const ServiceItem = require('../models/ServiceItem');
const M = require('../models/waterTankOps');

const VERTICAL = 'property_documentation_verification_csa';
const BRANCH_ID = 1;

// [code, name, unit, price, requiresSiteAssessment?] (sa = needs the due-diligence assessment first)
const SERVICES = [
  // Property Documentation & Verification
  ['PDV-001', 'Deed Verification', 'Case', 0, true],
  ['PDV-002', 'Chain of Ownership Verification', 'Case', 0, true],
  ['PDV-003', 'Title Review', 'Case', 0, true],
  ['PDV-004', 'Property Document Verification', 'Case', 0, true],
  ['PDV-005', 'Land Record Verification', 'Case', 0],
  ['PDV-006', 'Government Record Verification', 'Case', 0],
  ['PDV-007', 'Encumbrance Review', 'Case', 0, true],
  ['PDV-008', 'Due Diligence Documentation Review', 'Case', 0, true],
  ['PDV-009', 'Property Background Verification', 'Case', 0],
  // Mutation & Land Record Support
  ['PDV-010', 'Mutation Documentation Review', 'Case', 0],
  ['PDV-011', 'Mutation Application Support', 'Case', 0],
  ['PDV-012', 'Land Record Correction Support', 'Case', 0],
  ['PDV-013', 'Government Liaison Support', 'Case', 0],
  ['PDV-014', 'Record Status Verification', 'Case', 0],
  ['PDV-015', 'Mutation Follow-up', 'Visit', 0],
  // Property Documentation Support
  ['PDV-016', 'Documentation Review', 'Case', 0],
  ['PDV-017', 'Drafting Property Correspondence', 'Document', 0],
  ['PDV-018', 'Official Correspondence Coordination', 'Case', 0],
  ['PDV-019', 'Property File Compilation', 'Case', 0],
  ['PDV-020', 'Administrative Documentation Support', 'Case', 0],
  ['PDV-021', 'Record Management Support', 'Case', 0],
  // Conveyancing & Transfer Coordination
  ['PDV-022', 'Property Transfer Documentation Support', 'Case', 0, true],
  ['PDV-023', 'Conveyancing Coordination', 'Case', 0, true],
  ['PDV-024', 'Sale & Purchase Documentation Review', 'Case', 0],
  ['PDV-025', 'Registration Coordination', 'Case', 0],
  ['PDV-026', 'Settlement Coordination', 'Case', 0],
  ['PDV-027', 'Due Diligence Coordination', 'Case', 0, true],
  // NRB Property Documentation Support
  ['PDV-028', 'Overseas Documentation Coordination', 'Case', 0],
  ['PDV-029', 'Remote Document Verification', 'Case', 0],
  ['PDV-030', 'Digital Documentation Support', 'Case', 0],
  ['PDV-031', 'Property Ownership Verification', 'Case', 0],
  ['PDV-032', 'Cross-Border Documentation Coordination', 'Case', 0],
];

// Professional service fees (Work Order Section 7A) — labour group.
const PROFESSIONAL = [
  ['PRO-001', 'Consultation Fee', 'Session', 0],
  ['PRO-002', 'Documentation Review Fee', 'Case', 0],
  ['PRO-003', 'Verification Coordination Fee', 'Case', 0],
  ['PRO-004', 'Project Management Fee', 'Case', 0],
  ['PRO-005', 'Administration Fee', 'Case', 0],
];

// Government & third-party costs (Work Order Section 7B) — material group.
const THIRDPARTY = [
  ['TPC-001', 'Government Search Fees', 'Item', 0],
  ['TPC-002', 'Registration Fees', 'Item', 0],
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
      where: { service_line: 'property_documentation_verification', [Op.or]: like.map((l) => ({ lines: { [Op.like]: l } })) },
    }).catch(() => 0);
    if (used > 0) {
      console.error(`Refusing to reseed: ${used} PDV quotation(s) already reference the current catalogue. Reconcile first.`);
      process.exit(2);
    }
  }
  await ServiceItem.destroy({ where: { vertical: VERTICAL } });
  const data = rows();
  await ServiceItem.bulkCreate(data);
  const byGroup = data.reduce((m, r) => ((m[r.service_group] = (m[r.service_group] || 0) + 1), m), {});
  console.log(`Property Documentation & Verification catalogue seeded into ${VERTICAL}: ${data.length} items`, byGroup);
  console.log('All prices are 0 — set standard prices on the Price Schedule screen; they flow into Schedule C and work orders.');
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
