/** Pure math behind the Business Rent dashboards — no DB, so it is testable. */
const { BUSINESS_RENT_STAGES } = require('../scripts/seedBusinessRentWorkflow');

const dayOnly = (v) => String(v instanceof Date ? v.toISOString() : v).slice(0, 10);
const days = (from, to) => Math.max(0, Math.round(
  (new Date(`${dayOnly(to)}T00:00:00Z`) - new Date(`${dayOnly(from)}T00:00:00Z`)) / 86400000,
));
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const today = () => new Date().toISOString().slice(0, 10);

/** One row per SOP stage, in order, including the empty ones. */
function pipelineByStage(projects = [], asOf = today(), opts = {}) {
  const outstanding = num(opts.screeningOutstanding);
  return BUSINESS_RENT_STAGES.map((s) => {
    const rows = projects.filter((p) => p.current_stage_key === s.key);
    const oldestDays = rows.reduce((max, p) => Math.max(max, p.updated_at ? days(p.updated_at, asOf) : 0), 0);
    // SOP Rental §11: negotiating before screening resolves is the risk the SOP
    // names, so the stage carries the warning rather than blocking the work.
    const warning = (s.key === 'negotiation' && rows.length > 0 && outstanding > 0)
      ? `${outstanding} tenant screening(s) unresolved — resolve before committing to terms.`
      : null;
    return { key: s.key, name: s.name, department: s.department, count: rows.length, oldestDays, warning };
  });
}

function occupancy(properties = [], tenancies = [], asOf = today()) {
  const active = tenancies.filter((t) => t.status === 'active');
  const leasedIds = new Set(active.map((t) => t.property_id));
  const expiringSoon = active.filter((t) => {
    if (!t.lease_end) return false;
    const end = dayOnly(t.lease_end);
    return end >= dayOnly(asOf) && days(asOf, end) <= 90;
  }).length;
  return {
    total: properties.length,
    leased: leasedIds.size,
    vacant: Math.max(0, properties.length - leasedIds.size),
    expiringSoon,
  };
}

function arrearsAgeing(items = [], asOf = today()) {
  const out = { notDue: 0, '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  for (const i of items) {
    const amount = num(i.amount);
    if (!i.due_date || dayOnly(i.due_date) > dayOnly(asOf)) { out.notDue += amount; continue; }
    const age = days(i.due_date, asOf);
    if (age <= 30) out['0-30'] += amount;
    else if (age <= 60) out['31-60'] += amount;
    else if (age <= 90) out['61-90'] += amount;
    else out['90+'] += amount;
  }
  return out;
}

module.exports = { pipelineByStage, occupancy, arrearsAgeing };
