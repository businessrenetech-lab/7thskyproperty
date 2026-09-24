/**
 * Non-circumvention protection window — SOP Business Rental Management §13 and
 * Business Tenancy Management §12: an introduced tenant, company, investor,
 * operator or occupancy lead is protected for the engagement plus 12 months.
 */
const EXPIRING_DAYS = 60;

const iso = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

const dayOnly = (v) => String(v instanceof Date ? v.toISOString() : v).slice(0, 10);

function protectionExpiry(introductionDate, months = 12) {
  if (!introductionDate) return null;
  const d = new Date(`${dayOnly(introductionDate)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getUTCDate();
  // Shift the month from the 1st, then clamp the day, so 31 Aug + 6 months is
  // 28 Feb and not 3 March — a protection window must never overshoot.
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(out.getUTCFullYear(), out.getUTCMonth() + 1, 0)).getUTCDate();
  out.setUTCDate(Math.min(day, lastDay));
  return iso(out);
}

function protectionState(record = {}, today = iso(new Date())) {
  const end = record.protection_expires_on ? dayOnly(record.protection_expires_on) : null;
  if (!end) return { state: 'expired', daysLeft: 0 };
  const ms = new Date(`${end}T00:00:00Z`) - new Date(`${dayOnly(today)}T00:00:00Z`);
  const daysLeft = Math.round(ms / 86400000);
  if (daysLeft < 0) return { state: 'expired', daysLeft: 0 };
  return { state: daysLeft <= EXPIRING_DAYS ? 'expiring' : 'active', daysLeft };
}

module.exports = { EXPIRING_DAYS, protectionExpiry, protectionState };
