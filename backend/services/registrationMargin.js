/**
 * Per-project profitability for Business Registration.
 *
 * Government fees (RJSC, trade licence, stamps) are collected from the client and
 * paid to the authority, so they are neither revenue nor margin — counting them
 * would flatter every project. Revenue is the professional fee: what has been
 * invoiced once invoices exist, otherwise what was quoted.
 */
const { quoteTotals } = require('./registrationQuoteTotals');

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

function projectMargin({ quoteLines, providerCost = 0, invoicedProfessional = null } = {}) {
  const t = quoteTotals(quoteLines);
  const professional = invoicedProfessional == null ? t.professional : num(invoicedProfessional);
  const provider_cost = num(providerCost);
  const gross_margin = professional - provider_cost;
  const margin_pct = professional > 0 ? Math.round((gross_margin / professional) * 1000) / 10 : 0;
  return { government: t.government, professional, provider_cost, gross_margin, margin_pct };
}

module.exports = { projectMargin };
