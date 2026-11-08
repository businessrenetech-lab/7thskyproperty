/**
 * HRM organisation rules (plan Task 2). Pure functions: no database access, so they are unit-tested by
 * scripts/testHrOrg.js and reused by the controllers and reports.
 */
const { SEAT_HOLDING_STATUSES } = require('../config/hrCatalog');

const CODE_PREFIX = { company: 'CO-', division: 'DIV-', department: 'DEP-', team: 'TEAM-', position: 'POS-', cost_centre: 'CC-', salary_grade: 'GRD-' };

/** Next code after `lastCode`, padded to `pad` digits; grows past 9999 instead of wrapping (M1 §9). */
const nextCode = (prefix, lastCode, pad = 4) => {
  const n = lastCode ? parseInt(String(lastCode).slice(prefix.length), 10) || 0 : 0;
  return prefix + String(n + 1).padStart(pad, '0');
};

/**
 * Would making `positionId` report to `newReportsToId` create a loop? Returns the looping chain of ids,
 * starting and ending at positionId, or null when there is no loop.
 */
const reportingCycle = (positionId, newReportsToId, positions) => {
  if (newReportsToId == null) return null;
  const up = new Map(positions.map((p) => [Number(p.id), p.reports_to_position_id == null ? null : Number(p.reports_to_position_id)]));
  const chain = [Number(positionId)];
  let cur = Number(newReportsToId);
  const seen = new Set();
  while (cur != null && !seen.has(cur)) {
    chain.push(cur);
    if (cur === Number(positionId)) return chain;
    seen.add(cur);
    cur = up.get(cur) ?? null;
  }
  return null;
};

const PARENT_KEY = { company: 'company_id', division: 'division_id', department: 'department_id', team: 'team_id', position: 'position_id', cost_centre: 'cost_centre_id', salary_grade: 'salary_grade_id' };
const OPEN_VACANCY = ['pending_approval', 'published', 'Published', 'Open', 'open'];

/** What stops a division, department, team or position from being deactivated (Review Focus 4). */
const deactivationBlockers = (kind, id, { employees = [], vacancies = [], children = [] } = {}) => {
  const key = PARENT_KEY[kind];
  const mine = (r) => Number(r[key]) === Number(id);
  return {
    activeEmployees: employees.filter((e) => mine(e) && SEAT_HOLDING_STATUSES.includes(e.status)).length,
    openVacancies: vacancies.filter((v) => mine(v) && OPEN_VACANCY.includes(v.status)).length,
    activeChildren: children.filter((c) => mine(c) && c.is_active !== false).length,
  };
};

/** "This department still has 3 active employees and 1 open vacancy." or null. */
const blockerMessage = (kind, b) => {
  const parts = [];
  const n = (count, one, many) => `${count} ${count === 1 ? one : many}`;
  if (b.activeEmployees) parts.push(n(b.activeEmployees, 'active employee', 'active employees'));
  if (b.openVacancies) parts.push(n(b.openVacancies, 'open vacancy', 'open vacancies'));
  if (b.activeChildren) parts.push(n(b.activeChildren, 'active unit under it', 'active units under it'));
  if (!parts.length) return null;
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  return `This ${kind} still has ${list}.`;
};

/** HR alerts from M1 §9. Only active rows count; only the company's top position may have no supervisor. */
const orgAlerts = ({ departments = [], positions = [] }) => {
  const active = (r) => r.is_active !== false;
  return {
    departmentsWithoutManager: departments.filter((d) => active(d) && !d.manager_employee_id).map((d) => d.id),
    positionsWithoutSupervisor: positions.filter((p) => active(p) && !p.is_top && !p.reports_to_position_id).map((p) => p.id),
    positionsWithoutJobDescription: positions.filter((p) => active(p) && !String(p.job_description || '').trim()).map((p) => p.id),
  };
};

/**
 * The organisation as a tree: company → division → department → (team →) position. Every node is
 * { type, id, code, name, manager?, children[], headcount, vacancies }. Headcount counts employees in a
 * seat-holding status (or only `employmentStatus` when filtered); vacancies are seats not filled.
 * Filters (M1 §5): divisionId, departmentId, branchId (department location), positionId, managerId
 * (department manager or division head), employmentStatus. A filtered tree drops branches with no match.
 */
const buildOrgTree = (rows, filters = {}) => {
  const { companies = [], divisions = [], departments = [], teams = [], positions = [], employees = [] } = rows;
  const f = filters;
  const eq = (a, b) => a != null && b != null && String(a) === String(b);
  const counts = (s) => (f.employmentStatus ? s === f.employmentStatus : SEAT_HOLDING_STATUSES.includes(s));
  const filled = new Map();
  employees.forEach((e) => { if (counts(e.status)) filled.set(Number(e.position_id), (filled.get(Number(e.position_id)) || 0) + 1); });

  const sum = (node) => {
    node.headcount = node.children.reduce((a, c) => a + c.headcount, 0);
    node.vacancies = node.children.reduce((a, c) => a + c.vacancies, 0);
    return node;
  };
  const positionNode = (p) => {
    const hc = filled.get(Number(p.id)) || 0;
    return { type: 'position', id: p.id, code: p.code, name: p.title, title: p.title, children: [], headcount: hc, vacancies: Math.max(0, (p.headcount ?? 1) - hc) };
  };
  const posOk = (p) => p.is_active !== false && (!f.positionId || eq(p.id, f.positionId));

  const deptNode = (d) => {
    const ps = positions.filter((p) => eq(p.department_id, d.id) && posOk(p));
    const teamNodes = teams.filter((t) => eq(t.department_id, d.id) && t.is_active !== false).map((t) => sum({
      type: 'team', id: t.id, code: t.code, name: t.name, manager: t.leader_employee_id || null,
      children: ps.filter((p) => eq(p.team_id, t.id)).map(positionNode), headcount: 0, vacancies: 0,
    })).filter((t) => !f.positionId || t.children.length);
    const loose = ps.filter((p) => !p.team_id || !teams.some((t) => eq(t.id, p.team_id))).map(positionNode);
    return sum({ type: 'department', id: d.id, code: d.code, name: d.name, manager: d.manager_employee_id || null, children: [...teamNodes, ...loose], headcount: 0, vacancies: 0 });
  };

  const deptOk = (d, div) => d.is_active !== false
    && (!f.departmentId || eq(d.id, f.departmentId))
    && (!f.branchId || eq(d.location_branch_id, f.branchId))
    && (!f.managerId || eq(d.manager_employee_id, f.managerId) || eq(div.head_employee_id, f.managerId));
  const narrowed = f.departmentId || f.branchId || f.managerId || f.positionId;

  const divNodes = (companyId) => divisions
    .filter((v) => (companyId == null || eq(v.company_id, companyId)) && v.is_active !== false && (!f.divisionId || eq(v.id, f.divisionId)))
    .map((v) => sum({
      type: 'division', id: v.id, code: v.code, name: v.name, manager: v.head_employee_id || null,
      children: departments.filter((d) => eq(d.division_id, v.id) && deptOk(d, v)).map(deptNode)
        .filter((d) => !f.positionId || d.children.length),
      headcount: 0, vacancies: 0,
    }))
    .filter((v) => !narrowed || v.children.length);

  const c = companies[0] || { id: null, code: '', name: 'Organisation' };
  return sum({ type: 'company', id: c.id, code: c.code, name: c.name, children: divNodes(companies.length > 1 ? c.id : null), headcount: 0, vacancies: 0 });
};

module.exports = { CODE_PREFIX, nextCode, reportingCycle, deactivationBlockers, blockerMessage, orgAlerts, buildOrgTree };
