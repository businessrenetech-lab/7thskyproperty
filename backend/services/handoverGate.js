/**
 * Handover gate — SOP Business Rental Management §15: occupancy follows
 * payment, so a handover cannot complete while the commission invoice is
 * unpaid. A manager may override; the override is recorded, never silent.
 *
 * A lease that was never charged a commission is not gated — blocking a
 * handover over money nobody asked for would be a bug, not a control.
 */
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (n) => n.toLocaleString('en-US');

function canHandover(tenancy = {}, { override = false } = {}) {
  const charged = num(tenancy.commission_amount);
  if (charged <= 0) return { allowed: true, reason: null };
  const outstanding = charged - num(tenancy.commission_paid_amount);
  if (outstanding <= 0) return { allowed: true, reason: null };
  if (override) {
    return { allowed: true, reason: `Manager override: BDT ${money(outstanding)} commission still outstanding.` };
  }
  return { allowed: false, reason: `Commission of BDT ${money(outstanding)} is outstanding. Collect it or record a manager override.` };
}

module.exports = { canHandover };
