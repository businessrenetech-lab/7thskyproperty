// backend/services/brmAgreement.service.js
// Business Rental Management Service Agreement (SSPC-BRMS-01 v0.2), signed with
// the Business Owner / Landlord. Catalogue vertical: rent_rental_business.
// Shares the sales render engine — only the pack, schedules, doc no differ.
const render = require('./salesAgreementRender');
const CLAUSES = require('./brmClauses'); // AUTO-GENERATED verbatim from the V0.2 docx
const SCHED = require('./salesAgreementSchedules').rent_business;

const VERTICAL = 'rent_rental_business';
const CFG = {
  doc_no: 'SSPC-BRMS-01', version: '0.2',
  title: 'Business Rental Management Service Agreement',
  header_label: 'Seventh Sky Business Services',
  party: 'Owner', clauses: CLAUSES, ...SCHED,
};

async function getCatalog(branchId) { return render.getCatalog(VERTICAL, branchId); }
async function computePricing(input, branchId) { return render.computePricing(VERTICAL, input, branchId); }
function buildBrmAgreement(data) { return render.buildAgreement(CFG, data); }

module.exports = { getCatalog, computePricing, buildBrmAgreement };
