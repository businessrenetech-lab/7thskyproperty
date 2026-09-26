/**
 * Pure math behind the Rural Rent dashboards — no DB, so it is testable.
 *
 * `arrearsAgeing` and `occupancy` are not redefined here: they are category
 * agnostic and already live (and are already tested) in
 * businessRentDashboardMath.js. Re-implementing them would be two versions of
 * the same buckets drifting apart.
 */
const { RURAL_PROPERTY_TYPES } = require('../utils/ruralPropertyTypes');

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const dayOnly = (v) => String(v instanceof Date ? v.toISOString() : v).slice(0, 10);
const days = (from, to) => Math.round(
  (new Date(`${dayOnly(to)}T00:00:00Z`) - new Date(`${dayOnly(from)}T00:00:00Z`)) / 86400000,
);

/**
 * One row per rural property type, in SOP order, including the types with none,
 * plus a single Other bucket so an unrecognised or missing type is never lost.
 */
function propertyTypeCounts(properties = []) {
  const rows = RURAL_PROPERTY_TYPES.map((type) => ({
    type,
    count: properties.filter((p) => String(p.property_type || '') === type).length,
  }));
  const known = new Set(RURAL_PROPERTY_TYPES);
  const other = properties.filter((p) => !known.has(String(p.property_type || ''))).length;
  return [...rows, { type: 'Other', count: other }];
}

/** Occupancy as a percentage to one decimal: 0 when there is nothing to occupy. */
function occupancyRate(total, leased) {
  const t = num(total);
  if (t <= 0) return 0;
  return Math.round(Math.min(100, (num(leased) / t) * 100) * 10) / 10;
}

/** Sums money per rural property type. A property with no type lands in Other. */
function revenueByType(properties = [], rows = []) {
  const typeById = new Map(properties.map((p) => [Number(p.id), String(p.property_type || '') || 'Other']));
  const out = {};
  for (const r of rows) {
    const type = typeById.get(Number(r.property_id));
    // Money against a property this console cannot see is not this console's revenue.
    if (type === undefined) continue;
    out[type] = (out[type] || 0) + num(r.amount);
  }
  return out;
}

/** The headline lease numbers shared by the owner and executive dashboards. */
function leaseKpis(properties = [], tenancies = [], asOf = new Date().toISOString().slice(0, 10)) {
  const active = tenancies.filter((t) => t.status === 'active');
  const occupiedIds = new Set(active.map((t) => Number(t.property_id)));
  const renewalsDue = active.filter((t) => {
    if (!t.lease_end) return false;
    const d = days(asOf, t.lease_end);
    return d >= 0 && d <= 90;
  }).length;
  const total = properties.length;
  const occupied = occupiedIds.size;
  return {
    total,
    occupied,
    vacant: Math.max(0, total - occupied),
    activeLeases: active.length,
    renewalsDue,
    occupancyRate: occupancyRate(total, occupied),
  };
}

module.exports = { propertyTypeCounts, occupancyRate, revenueByType, leaseKpis };
