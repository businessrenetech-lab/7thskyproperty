// backend/services/btmAgreement.service.js
// Business Tenancy Management Service Agreement (SSPC-BTMS-01 v0.2), signed with
// the Business Tenant / Lessee. Catalogue vertical: rent_tenancy_business.
// Shares the sales render engine — only the pack, schedules, doc no differ.
const render = require('./salesAgreementRender');
const CLAUSES = require('./btmClauses'); // AUTO-GENERATED verbatim from the V0.2 docx
const SCHED = require('./salesAgreementSchedules').tenancy_business;

const VERTICAL = 'rent_tenancy_business';
const CFG = {
  doc_no: 'SSPC-BTMS-01', version: '0.2',
  title: 'Business Tenancy Management Service Agreement',
  header_label: 'Seventh Sky Business Services',
  party: 'Tenant', clauses: CLAUSES, ...SCHED,
};

async function getCatalog(branchId) { return render.getCatalog(VERTICAL, branchId); }
async function computePricing(input, branchId) { return render.computePricing(VERTICAL, input, branchId); }
function buildBtmAgreement(data) { return render.buildAgreement(CFG, data); }

module.exports = { getCatalog, computePricing, buildBtmAgreement };
