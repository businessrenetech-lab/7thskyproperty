// backend/services/rppsAgreement.service.js
// Residential Property Purchase Service Agreement (SSPC-RPPS-01 v0.2), signed
// with the Buyer. Catalogue vertical: sale_purchase.
const render = require('./salesAgreementRender');
const CLAUSES = require('./rppsClauses'); // AUTO-GENERATED verbatim from the V0.2 docx

const VERTICAL = 'sale_purchase';
const CFG = { doc_no: 'SSPC-RPPS-01', version: '0.2', title: 'Residential Property Purchase Service Agreement', party: 'Buyer', clauses: CLAUSES };

async function getCatalog(branchId) { return render.getCatalog(VERTICAL, branchId); }
async function computePricing(input, branchId) { return render.computePricing(VERTICAL, input, branchId); }
function buildRppsAgreement(data) { return render.buildAgreement(CFG, data); }

module.exports = { getCatalog, computePricing, buildRppsAgreement };
