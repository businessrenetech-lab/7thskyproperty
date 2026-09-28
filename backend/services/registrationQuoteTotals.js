/**
 * Quotation totals split by fee kind.
 *
 * Business Registration quotes mix two very different things: government fees
 * (RJSC, licence, stamps — collected from the client and paid straight to the
 * authority) and Seventh Sky's professional fee. Only the professional fee is
 * revenue, so margin and the Revenue/Profitability dashboards must never count
 * the pass-through. Lines without a fee_kind are professional, which keeps every
 * other service line's quotes behaving exactly as before.
 */
const asList = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

function quoteTotals(lines, quote = {}) {
  let government = 0;
  let professional = 0;
  for (const l of asList(lines)) {
    // The shared builder stores money as `price`; `amount` is accepted too so a
    // quote written by any other path still totals.
    const money = l.amount != null ? l.amount : l.price;
    // An explicit qty of 0 bills nothing; a missing qty means one.
    const value = num(money) * (l.qty == null ? 1 : num(l.qty));
    if (l.fee_kind === 'government') government += value;
    else professional += value;
  }
  // A negotiated discount reduces OUR fee, never the government fees we pass
  // through, so the Revenue panel reconciles with what is actually invoiced.
  const discount = num(quote.discount);
  if (discount > 0) professional = Math.max(0, professional - discount);
  return { government, professional, subtotal: government + professional };
}

module.exports = { quoteTotals };
