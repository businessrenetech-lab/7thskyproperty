// backend/services/bssAgreement.service.js
// Business Sale Customer Service Agreement (SSPC-BSS-01 v0.2), signed with the
// Business Owner / Seller. Catalogue vertical: sale_sale_business. Shares the
// sales render engine — only the clause pack, schedules, doc no and header differ.
const render = require('./salesAgreementRender');
const CLAUSES = require('./bssClauses'); // AUTO-GENERATED verbatim from the V0.2 docx
const SCHED = require('./salesAgreementSchedules').sale_business;

const VERTICAL = 'sale_sale_business';
const CFG = {
  doc_no: 'SSPC-BSS-01', version: '0.2',
  title: 'Business Sale Customer Service Agreement',
  header_label: 'Seventh Sky Business Services',
  party: 'Seller', clauses: CLAUSES, ...SCHED,
};

async function getCatalog(branchId) { return render.getCatalog(VERTICAL, branchId); }
async function computePricing(input, branchId) { return render.computePricing(VERTICAL, input, branchId); }
function buildBssAgreement(data) { return render.buildAgreement(CFG, data); }

module.exports = { getCatalog, computePricing, buildBssAgreement };
