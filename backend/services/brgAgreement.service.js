// backend/services/brgAgreement.service.js
// Business Registration Customer Service Agreement (SSPC-BR-CSA-01 v0.2), signed
// with the Client. Catalogue vertical: registration_registration_business.
// Shares the sales render engine — only the clause pack, schedules and doc no differ.
const render = require('./salesAgreementRender');
const CLAUSES = require('./brgClauses'); // AUTO-GENERATED verbatim from the V0.2 docx
const SCHED = require('./salesAgreementSchedules').registration_business;

const VERTICAL = 'registration_registration_business';
const CFG = {
  doc_no: 'SSPC-BR-CSA-01', version: '0.2',
  title: 'Business Registration Customer Service Agreement',
  header_label: 'Seventh Sky Business Registration Services',
  party: 'Client', clauses: CLAUSES, ...SCHED,
};

async function getCatalog(branchId) { return render.getCatalog(VERTICAL, branchId); }
async function computePricing(input, branchId) { return render.computePricing(VERTICAL, input, branchId); }
function buildBrgAgreement(data) { return render.buildAgreement(CFG, data); }

module.exports = { getCatalog, computePricing, buildBrgAgreement };
