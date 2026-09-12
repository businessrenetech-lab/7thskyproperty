/**
 * agencyFees.service.js — the agency's fees for a sale, derived from the agency
 * agreement captured on the vendor's SaleProfile.
 *
 * Commission is either FIXED or a PERCENTAGE of the total sale value. The marketing
 * fee comes from the agreed marketing budget. Both are fetched here so the payout,
 * the settlement statement and the vendor invoice all quote the same numbers and
 * the same terms.
 */
const { SaleProfile, SaleSettlementLine } = require('../models/SalesModels');
const SigningEnvelope = require('../models/SigningEnvelope');

const num = (v) => Number(v || 0);
const round = (v) => Math.round(num(v) * 100) / 100;
const asObj = (v) => { if (v && typeof v === 'object') return v; try { return JSON.parse(v || '{}'); } catch { return {}; } };

// Every Schedule C fee that is deducted from the vendor's proceeds and billed on
// the vendor invoice. commission + advertising are provenance-protected (quoted
// from the agreement); the rest are adjustable settlement lines.
const VENDOR_INVOICE_LINE_TYPES = ['commission', 'advertising', 'agency_fee', 'admin_fee', 'vat_tax', 'third_party'];
const SCHEDULE_C_OTHER = {
  agency_fee: 'Professional service fees',
  admin_fee: 'Administrative charges',
  vat_tax: 'VAT',
  third_party: 'Third-party costs',
};

/* The remaining Schedule C fees (beyond commission + marketing) from the signed
   SALE agreement, so the settlement reflects everything selected in Schedule C.
   Returns zeros when no completed agreement exists (keeps legacy settlements
   unchanged). */
async function scheduleCFor({ property_id, branch_id }, options = {}) {
  const env = await SigningEnvelope.findOne({
    where: { branch_id, related_id: property_id, related_type: 'sale_sale_agreement', status: 'completed' },
    order: [['completed_at', 'DESC'], ['id', 'DESC']], ...options,
  });
  if (!env) return { found: false, envelope_code: null, professional: 0, third_party: 0, admin: 0, vat: 0 };
  const s = asObj(asObj(env.terms).pricing_summary);
  return {
    found: true, envelope_code: env.envelope_code,
    professional: round(s.professional_service_fees),
    third_party: round(s.third_party_costs),
    admin: round(s.administrative_charges),
    vat: round(s.vat),
  };
}

/* Derive commission from the agreement. A fixed amount always wins over a percent
   — that mirrors how the agreement is captured (staff set one or the other). */
function commissionFrom(profile, saleValue) {
  const fixed = num(profile?.commission_fixed);
  const pct = num(profile?.commission_percent);
  if (fixed > 0) return { amount: round(fixed), basis: 'fixed', rate: null, basis_amount: round(saleValue) };
  if (pct > 0) return { amount: round(saleValue * pct / 100), basis: 'percent', rate: pct, basis_amount: round(saleValue) };
  return { amount: 0, basis: null, rate: null, basis_amount: round(saleValue) };
}

/* Plain-English terms for the invoice/statement. This is the sentence the vendor
   reads, so it must state the basis, not just the number. */
function commissionTerms({ basis, rate, basis_amount, amount }, { agencyType, edited } = {}) {
  const bdt = (v) => `BDT ${num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  let text;
  if (basis === 'percent') text = `Agency commission of ${num(rate)}% of the total sale value of ${bdt(basis_amount)} = ${bdt(amount)}.`;
  else if (basis === 'fixed') text = `Agency commission of a fixed ${bdt(amount)} as agreed in the agency agreement.`;
  else text = 'No agency commission is payable under the agency agreement.';
  if (agencyType) text += ` Agreement type: ${agencyType}.`;
  if (edited) text += ` ${edited}`;
  return text;
}

function marketingTerms(fee) {
  if (num(fee) <= 0) return null;
  return `Marketing fee of BDT ${num(fee).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} as agreed in the agency agreement.`;
}

/**
 * The agency's fees for a settlement, straight from the vendor's agreement.
 * Returns the prefill used by "Create payout → Agency".
 */
async function quoteForSale({ property_id, branch_id, sale_value }, options = {}) {
  const profile = await SaleProfile.findOne({ where: { property_id, branch_id }, ...options });
  const commission = commissionFrom(profile, sale_value);
  const marketing_fee = round(profile?.marketing_budget);
  return {
    sale_value: round(sale_value),
    agreement_found: !!profile,
    agency_type: profile?.agency_type || null,
    commission,
    commission_terms: commissionTerms(commission, { agencyType: profile?.agency_type }),
    marketing_fee,
    marketing_terms: marketingTerms(marketing_fee),
    total: round(commission.amount + marketing_fee),
  };
}

/* The settlement lines the agency is paid from — commission + marketing/advertising. */
const AGENCY_LINE_TYPES = ['commission', 'advertising'];

async function agencyLinesFor(settlement_id, options = {}) {
  return SaleSettlementLine.findAll({ where: { settlement_id }, ...options })
    .then((rows) => rows.filter((r) => AGENCY_LINE_TYPES.includes(r.line_type)));
}

/* Everything a vendor invoice needs, from the settlement's own lines (so an edited
   commission is quoted, not the raw agreement figure). */
function invoiceFigures(lines) {
  const commissionLine = lines.find((l) => l.line_type === 'commission');
  const marketingLine = lines.find((l) => l.line_type === 'advertising');
  const commission_amount = round(commissionLine?.amount);
  const marketing_fee = round(marketingLine?.amount);
  // The remaining Schedule C fees present on the settlement (adjustable lines).
  const other_fees = lines
    .filter((l) => SCHEDULE_C_OTHER[l.line_type] && round(l.amount) > 0)
    .map((l) => ({ line_type: l.line_type, label: SCHEDULE_C_OTHER[l.line_type], amount: round(l.amount), terms: l.terms || null }));
  const other_total = round(other_fees.reduce((sum, l) => sum + l.amount, 0));
  const terms = [commissionLine?.terms, marketingLine?.terms, ...other_fees.map((l) => l.terms)].filter(Boolean).join('\n');
  return {
    commission_amount,
    commission_basis: commissionLine?.fee_basis || null,
    commission_rate: commissionLine?.fee_rate ?? null,
    sale_value: round(commissionLine?.fee_basis_amount),
    marketing_fee,
    other_fees,
    other_total,
    total_amount: round(commission_amount + marketing_fee + other_total),
    terms,
  };
}

module.exports = { quoteForSale, commissionFrom, commissionTerms, marketingTerms, agencyLinesFor, invoiceFigures, scheduleCFor, AGENCY_LINE_TYPES, VENDOR_INVOICE_LINE_TYPES, SCHEDULE_C_OTHER };
