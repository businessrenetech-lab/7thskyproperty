// backend/services/cppsAgreement.service.js
// Commercial Property Purchase Service Agreement (SSPC-CPPS-01 v0.2), signed
// with the Buyer. Catalogue vertical: sale_purchase_commercial. Shares the
// sales render engine — only the clause pack, schedules, doc no and header differ.
const render = require('./salesAgreementRender');
const CLAUSES = require('./cppsClauses'); // AUTO-GENERATED verbatim from the V0.2 docx
const SCHED = require('./salesAgreementSchedules').purchase_commercial;

const VERTICAL = 'sale_purchase_commercial';
const CFG = {
  doc_no: 'SSPC-CPPS-01', version: '0.2',
  title: 'Commercial Property Purchase Service Agreement',
  header_label: 'Seventh Sky Commercial Property Services',
  party: 'Buyer', clauses: CLAUSES, ...SCHED,
};

async function getCatalog(branchId) { return render.getCatalog(VERTICAL, branchId); }
async function computePricing(input, branchId) { return render.computePricing(VERTICAL, input, branchId); }
function buildCppsAgreement(data) { return render.buildAgreement(CFG, data); }

module.exports = { getCatalog, computePricing, buildCppsAgreement };
