/**
 * seedLoanFinancialCatalog.js — the Loan & Financial Support price schedule.
 *
 * Source of truth: "Loan & Financial Support Services Customer Service Agreement
 * V0.2" (Schedule A) and the Project Work Order V0.2 (Section 7 Pricing). The
 * client has NOT supplied prices, so every item is seeded at 0 — standard prices
 * are entered on the Price Schedule screen and flow into Schedule C of the
 * agreement and the work order. Codes: LFS- coordination services (service group),
 * PRO- professional fees (labour group), TPC- third-party costs (material group).
 *
 * Idempotent: rewrites the loan_financial_support_csa vertical each run. Never
 * touches other verticals. Refuses to clear if a priced LFS quotation references
 * the current catalogue.
 */
const { Op } = require('sequelize');
const ServiceItem = require('../models/ServiceItem');
const M = require('../models/waterTankOps');

const VERTICAL = 'loan_financial_support_csa';
const BRANCH_ID = 1;

// [code, name, unit, price, requiresSiteAssessment?]  (sa = needs the financial eligibility assessment first)
const SERVICES = [
  // Loan & Mortgage Support
  ['LFS-001', 'Home Loan Assistance', 'Case', 0, true],
  ['LFS-002', 'Investment Property Loan Assistance', 'Case', 0, true],
  ['LFS-003', 'Commercial Property Loan Assistance', 'Case', 0, true],
  ['LFS-004', 'Construction Loan Assistance', 'Case', 0, true],
  ['LFS-005', 'Land Purchase Loan Assistance', 'Case', 0, true],
  ['LFS-006', 'Mortgage Coordination', 'Case', 0],
  ['LFS-007', 'Loan Refinancing Support', 'Case', 0, true],
  ['LFS-008', 'Loan Documentation Assistance', 'Case', 0],
  ['LFS-009', 'Banking Liaison Support', 'Case', 0],
  ['LFS-010', 'Pre-Approval Coordination', 'Case', 0],
  ['LFS-011', 'Loan Settlement Coordination', 'Case', 0],
  // Property Valuation Coordination
  ['LFS-012', 'Residential Property Valuation Coordination', 'Property', 0],
  ['LFS-013', 'Commercial Property Valuation Coordination', 'Property', 0],
  ['LFS-014', 'Industrial Property Valuation Coordination', 'Property', 0],
  ['LFS-015', 'Agricultural Property Valuation Coordination', 'Property', 0],
  ['LFS-016', 'Land Valuation Coordination', 'Property', 0],
  ['LFS-017', 'Mortgage Valuation Coordination', 'Property', 0],
  ['LFS-018', 'Independent Valuation Coordination', 'Property', 0],
  ['LFS-019', 'Valuation Report Review', 'Report', 0],
  ['LFS-020', 'Revaluation Coordination', 'Property', 0],
  // Financial Documentation Support
  ['LFS-021', 'Financial Document Review', 'Case', 0],
  ['LFS-022', 'Income Verification Coordination', 'Case', 0],
  ['LFS-023', 'Asset & Liability Documentation', 'Case', 0],
  ['LFS-024', 'Loan Application Documentation', 'Case', 0],
  ['LFS-025', 'Financial Record Coordination', 'Case', 0],
  ['LFS-026', 'Supporting Evidence Collection', 'Case', 0],
  ['LFS-027', 'Identity Verification Coordination', 'Case', 0],
  ['LFS-028', 'Compliance Documentation', 'Case', 0],
  // NRB Financial Support
  ['LFS-029', 'Overseas Client Loan Coordination', 'Case', 0, true],
  ['LFS-030', 'Remote Documentation Support', 'Case', 0],
  ['LFS-031', 'Digital Document Verification Coordination', 'Case', 0],
  ['LFS-032', 'Financial Institution Liaison', 'Case', 0],
  ['LFS-033', 'Overseas Settlement Coordination', 'Case', 0],
  ['LFS-034', 'Cross-Border Documentation Support', 'Case', 0],
  ['LFS-035', 'Property Finance Coordination', 'Case', 0],
];

// Professional service fees (Work Order Section 7A) — labour group.
const PROFESSIONAL = [
  ['PRO-001', 'Consultation Fee', 'Session', 0],
  ['PRO-002', 'Loan Coordination Fee', 'Case', 0],
  ['PRO-003', 'Documentation Support', 'Case', 0],
  ['PRO-004', 'Project Management Fee', 'Case', 0],
  ['PRO-005', 'Administration Fee', 'Case', 0],
];

// Third-party costs (Work Order Section 7B) — material group, passed through.
const THIRDPARTY = [
  ['TPC-001', 'Property Valuation', 'Item', 0],
  ['TPC-002', 'Government Charges', 'Item', 0],
  ['TPC-003', 'Legal / Registration Fees', 'Item', 0],
  ['TPC-004', 'Bank Charges', 'Item', 0],
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
      where: { service_line: 'loan_financial_support', [Op.or]: like.map((l) => ({ lines: { [Op.like]: l } })) },
    }).catch(() => 0);
    if (used > 0) {
      console.error(`Refusing to reseed: ${used} LFS quotation(s) already reference the current catalogue. Reconcile first.`);
      process.exit(2);
    }
  }
  await ServiceItem.destroy({ where: { vertical: VERTICAL } });
  const data = rows();
  await ServiceItem.bulkCreate(data);
  const byGroup = data.reduce((m, r) => ((m[r.service_group] = (m[r.service_group] || 0) + 1), m), {});
  console.log(`Loan & Financial Support catalogue seeded into ${VERTICAL}: ${data.length} items`, byGroup);
  console.log('All prices are 0 — set standard prices on the Price Schedule screen; they flow into Schedule C and work orders.');
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
