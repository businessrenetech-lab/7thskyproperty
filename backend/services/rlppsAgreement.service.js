// backend/services/rlppsAgreement.service.js
// Rural Property Purchase Service Agreement (SSPC-RLPPS-01 v0.2), signed with the
// Buyer. Catalogue vertical: sale_purchase_rural.
const render = require('./salesAgreementRender');
const CLAUSES = require('./rlppsClauses'); // AUTO-GENERATED verbatim from the V0.2 docx
const SCHED = require('./salesAgreementSchedules').purchase_rural;

const VERTICAL = 'sale_purchase_rural';
const CFG = {
  doc_no: 'SSPC-RLPPS-01', version: '0.2',
  title: 'Rural Property Purchase Service Agreement',
  header_label: 'Seventh Sky Rural Property Services',
  party: 'Buyer', clauses: CLAUSES, ...SCHED,
};

async function getCatalog(branchId) { return render.getCatalog(VERTICAL, branchId); }
async function computePricing(input, branchId) { return render.computePricing(VERTICAL, input, branchId); }
function buildRlppsAgreement(data) { return render.buildAgreement(CFG, data); }

module.exports = { getCatalog, computePricing, buildRlppsAgreement };
