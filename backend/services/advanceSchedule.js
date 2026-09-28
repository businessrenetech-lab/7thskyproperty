/**
 * Advance rent and deposits for business leases — SOP Business Rental
 * Management §9. Advance is normally twelve months, and each deposit type is
 * settled separately at exit, so both are tracked as agreed / received /
 * outstanding rather than as one number on the tenancy.
 */
const DEPOSIT_TYPES = ['security', 'utility', 'maintenance', 'operational_reserve'];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function advanceState(tenancy = {}, payments = []) {
  const months = num(tenancy.advance_months);
  const agreed = num(tenancy.advance_rent) || months * num(tenancy.monthly_rent);
  // Payment rows are the truth when there are any; otherwise the figure recorded
  // on the tenancy, so a lease entered without receipts still reports honestly.
  const received = (payments || []).length
    ? payments.reduce((t, p) => t + num(p.amount), 0)
    : num(tenancy.advance_received);
  const outstanding = Math.max(0, agreed - received);
  const perMonth = num(tenancy.monthly_rent);
  const covered = perMonth > 0 ? Math.floor(received / perMonth) : 0;
  const monthsCovered = months > 0 ? Math.min(months, covered) : covered;
  return { agreed, received, outstanding, monthsCovered };
}

function depositSummary(deposits = []) {
  const byType = {};
  let agreed = 0;
  let received = 0;
  for (const d of deposits) {
    const key = String(d.deposit_type || 'unspecified');
    const a = num(d.amount);
    const r = num(d.received_amount);
    byType[key] = byType[key] || { agreed: 0, received: 0, outstanding: 0 };
    byType[key].agreed += a;
    byType[key].received += r;
    byType[key].outstanding = Math.max(0, byType[key].agreed - byType[key].received);
    agreed += a;
    received += r;
  }
  return { byType, total: { agreed, received, outstanding: Math.max(0, agreed - received) } };
}

module.exports = { DEPOSIT_TYPES, advanceState, depositSummary };
