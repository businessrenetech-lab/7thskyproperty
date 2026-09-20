// backend/services/bpsAgreement.service.js
// Business Purchase Customer Service Agreement (SSPC-BPS-01 v0.2), signed with
// the Buyer / Acquirer. Catalogue vertical: sale_purchase_business. Shares the
// sales render engine — only the clause pack, schedules, doc no and header differ.
const render = require('./salesAgreementRender');
const CLAUSES = require('./bpsClauses'); // AUTO-GENERATED verbatim from the V0.2 docx
const SCHED = require('./salesAgreementSchedules').purchase_business;

const VERTICAL = 'sale_purchase_business';
const CFG = {
  doc_no: 'SSPC-BPS-01', version: '0.2',
  title: 'Business Purchase Customer Service Agreement',
  header_label: 'Seventh Sky Business Services',
  party: 'Buyer', clauses: CLAUSES, ...SCHED,
};

async function getCatalog(branchId) { return render.getCatalog(VERTICAL, branchId); }
async function computePricing(input, branchId) { return render.computePricing(VERTICAL, input, branchId); }
function buildBpsAgreement(data) { return render.buildAgreement(CFG, data); }

module.exports = { getCatalog, computePricing, buildBpsAgreement };
