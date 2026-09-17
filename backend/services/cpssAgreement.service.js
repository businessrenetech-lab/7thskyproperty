// backend/services/cpssAgreement.service.js
// Commercial Property Sale Service Agreement (SSPC-CPSS-01 v0.2), signed with
// the Seller/Owner. Catalogue vertical: sale_sale_commercial. Shares the sales
// render engine — only the clause pack, schedules, doc no and header differ.
const render = require('./salesAgreementRender');
const CLAUSES = require('./cpssClauses'); // AUTO-GENERATED verbatim from the V0.2 docx
const SCHED = require('./salesAgreementSchedules').sale_commercial;

const VERTICAL = 'sale_sale_commercial';
const CFG = {
  doc_no: 'SSPC-CPSS-01', version: '0.2',
  title: 'Commercial Property Sale Service Agreement',
  header_label: 'Seventh Sky Commercial Property Services',
  party: 'Seller', clauses: CLAUSES, ...SCHED,
};

async function getCatalog(branchId) { return render.getCatalog(VERTICAL, branchId); }
async function computePricing(input, branchId) { return render.computePricing(VERTICAL, input, branchId); }
function buildCpssAgreement(data) { return render.buildAgreement(CFG, data); }

module.exports = { getCatalog, computePricing, buildCpssAgreement };
