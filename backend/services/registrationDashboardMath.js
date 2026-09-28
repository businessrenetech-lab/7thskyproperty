/**
 * Which quotation speaks for a project, and what the line has actually quoted.
 *
 * Two traps this exists to avoid:
 *  1. `wt_quotations.project_id` is a STRING holding the project CODE (BR-P0001),
 *     not the numeric id — joining on the id silently matches nothing and reports
 *     every project at zero revenue.
 *  2. The register deliberately keeps superseded quotes (SOP §6: a declined quote
 *     is revised and re-issued). Summing them all bills the client twice.
 */
const { quoteTotals } = require('./registrationQuoteTotals');

const live = (q) => String(q.decision || '').toLowerCase() !== 'rejected';
const approved = (q) => String(q.decision || '').toLowerCase() === 'approved';
const newest = (a, b) => Number(b.id || 0) - Number(a.id || 0);

/** The quote that represents this project: latest approved, else latest live. */
function quoteForProject(quotes, project) {
  if (!project || !project.code) return null;
  const mine = (quotes || []).filter((q) => live(q) && String(q.project_id || '') === String(project.code));
  if (!mine.length) return null;
  const pick = mine.filter(approved).sort(newest)[0] || mine.sort(newest)[0];
  return pick || null;
}

/** Line totals: one quote per project, plus direct quotes not yet tied to one. */
function lineRevenue(quotes) {
  const all = (quotes || []).filter(live);
  const byProject = new Map();
  const unlinked = [];
  for (const q of all) {
    const key = String(q.project_id || '');
    if (!key) { unlinked.push(q); continue; }
    const kept = byProject.get(key);
    if (!kept || (approved(q) && !approved(kept)) || (approved(q) === approved(kept) && newest(kept, q) > 0)) {
      byProject.set(key, q);
    }
  }
  let government = 0;
  let professional = 0;
  for (const q of [...byProject.values(), ...unlinked]) {
    const t = quoteTotals(q.lines, q);
    government += t.government;
    professional += t.professional;
  }
  return { government, professional, subtotal: government + professional };
}

module.exports = { quoteForProject, lineRevenue };
