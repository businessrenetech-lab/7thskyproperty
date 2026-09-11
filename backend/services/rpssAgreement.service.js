// backend/services/rpssAgreement.service.js
// Residential Property Sale Service Agreement (SSPC-RPSS-01 v0.2), signed with
// the Seller/Owner. Catalogue vertical: sale_sale.
const render = require('./salesAgreementRender');
const CLAUSES = require('./rpssClauses'); // AUTO-GENERATED verbatim from the V0.2 docx

const VERTICAL = 'sale_sale';
const CFG = { doc_no: 'SSPC-RPSS-01', version: '0.2', title: 'Residential Property Sale Service Agreement', party: 'Seller', clauses: CLAUSES };

async function getCatalog(branchId) { return render.getCatalog(VERTICAL, branchId); }
async function computePricing(input, branchId) { return render.computePricing(VERTICAL, input, branchId); }
function buildRpssAgreement(data) { return render.buildAgreement(CFG, data); }

module.exports = { getCatalog, computePricing, buildRpssAgreement };
