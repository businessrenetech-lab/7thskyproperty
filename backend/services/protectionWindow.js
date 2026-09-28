/**
 * Non-circumvention protection window — SOP Business Rental Management §13 and
 * Business Tenancy Management §12: an introduced tenant, company, investor,
 * operator or occupancy lead is protected for the engagement plus 12 months.
 */
const EXPIRING_DAYS = 60;

/**
 * How long an introduction stays protected, per console.
 *
 * Rural is 24 months (SOP Rural Rental Management §13 / Tenancy Management §11);
 * everything else is 12. Note the deliberate difference from the signed rural
 * agreements, whose clause 22 states twelve (12) months: the agreement is what is
 * enforceable against the client, while this register is how long Seventh Sky
 * tracks the introduction internally.
 *
 * An unknown category falls back to 12, so no existing caller changes.
 */
const PROTECTION_MONTHS_BY_CATEGORY = { rural: 24 };
const DEFAULT_PROTECTION_MONTHS = 12;
const protectionMonthsFor = (category) =>
  PROTECTION_MONTHS_BY_CATEGORY[String(category || '')] || DEFAULT_PROTECTION_MONTHS;


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

module.exports = {
  EXPIRING_DAYS, PROTECTION_MONTHS_BY_CATEGORY, DEFAULT_PROTECTION_MONTHS,
  protectionMonthsFor, protectionExpiry, protectionState,
};
