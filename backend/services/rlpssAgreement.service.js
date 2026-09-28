// backend/services/rlpssAgreement.service.js
// Rural Property Sale Service Agreement (SSPC-RLPSS-01 v0.2), signed with the
// Seller/Owner. Catalogue vertical: sale_sale_rural. Shares the sales render
// engine - only the clause pack, schedules, doc no and header differ.
const render = require('./salesAgreementRender');
const CLAUSES = require('./rlpssClauses'); // AUTO-GENERATED verbatim from the V0.2 docx
const SCHED = require('./salesAgreementSchedules').sale_rural;

const VERTICAL = 'sale_sale_rural';
const CFG = {
  doc_no: 'SSPC-RLPSS-01', version: '0.2',
  title: 'Rural Property Sale Service Agreement',
  header_label: 'Seventh Sky Rural Property Services',
  party: 'Seller', clauses: CLAUSES, ...SCHED,
};

async function getCatalog(branchId) { return render.getCatalog(VERTICAL, branchId); }
async function computePricing(input, branchId) { return render.computePricing(VERTICAL, input, branchId); }
function buildRlpssAgreement(data) { return render.buildAgreement(CFG, data); }

module.exports = { getCatalog, computePricing, buildRlpssAgreement };
