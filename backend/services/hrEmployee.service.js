/**
 * HRM employee rules (plan Tasks 10 and 12; M1 §10, M2 §2–5, §9, §11). Pure functions: no database access,
 * unit-tested by scripts/testHrEmployee.js and used by the employee controller, appliers and reminders.
 */
const { nextCode } = require('./hrOrg.service');
const { NON_STAFF } = require('../utils/hrRoles');

const nextEmployeeCode = (lastCode) => nextCode('SSPC-EMP-', lastCode);

/** M1 §10: no employee without company, division, department, position and supervisor (the top seat has none). */
const LINKS = [['company_id', 'company'], ['division_id', 'division'], ['department_id', 'department'], ['position_id', 'position'], ['supervisor_employee_id', 'supervisor']];
const missingLinks = (emp, { topPosition = false } = {}) => LINKS
  .filter(([k, name]) => (emp[k] == null || emp[k] === '') && !(name === 'supervisor' && topPosition))
  .map(([, name]) => name);

/** M2 §3.3 statuses, moved along the §5 lifecycle. Leavers end at Inactive; Inactive can only be rehired. */
const LEAVE = ['Resigned', 'Terminated', 'Retired', 'Deceased'];
const MOVES = {
  Applicant: ['Offer Accepted', 'Inactive'],
  'Offer Accepted': ['Onboarding', 'Inactive'],
  Onboarding: ['Probation', 'Active', 'Inactive'],
  Probation: ['Confirmed', 'Active', 'Suspended', 'Resigned', 'Terminated', 'Deceased'],
  Active: ['Confirmed', 'Suspended', ...LEAVE],
  Confirmed: ['Suspended', ...LEAVE],
  Suspended: ['Active', 'Confirmed', 'Resigned', 'Terminated'],
  Resigned: ['Inactive'], Terminated: ['Inactive'], Retired: ['Inactive'], Deceased: ['Inactive'],
  Inactive: ['Active'],
};
const nextStatuses = (status) => MOVES[status] || [];

/** M2 §18: who counts as staff for attendance, leave and payroll. Applicants and leavers do not. */
const OFF_ROSTER = ['Applicant', 'Inactive', ...LEAVE];
const onRoster = (emp) => Boolean(emp && !emp.archived_at && !OFF_ROSTER.includes(emp.status));

/** '' and null match, 30000 and "30000.00" match, lists compare by content. */
const sameValue = (a, b) => {
  const empty = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);
  if (empty(a) && empty(b)) return true;
  if (typeof a === 'object' || typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b);
  if (typeof a === 'boolean' || typeof b === 'boolean') return Boolean(Number(a) || a === true) === Boolean(Number(b) || b === true);
  if (a !== '' && b !== '' && !Number.isNaN(Number(a)) && !Number.isNaN(Number(b))) return Number(a) === Number(b);
  return String(a) === String(b);
};

// M2 §9: which approval each field needs. Anything not listed is written straight away (and logged).
const FIELD_KIND = {
  basic_salary: 'emp.salary', salary_grade_id: 'emp.salary',
  allowances: 'emp.allowance', deduction_rules: 'emp.deduction',
  commission_eligible: 'emp.salary_structure', bonus_eligible: 'emp.salary_structure', overtime_eligible: 'emp.salary_structure',
  provident_fund_eligible: 'emp.salary_structure', tax_status: 'emp.salary_structure', loan_balance: 'emp.salary_structure',
  bank_name: 'emp.bank', bank_account_no: 'emp.bank', bank_branch: 'emp.bank', mobile_banking_no: 'emp.bank',
  company_id: 'emp.transfer', division_id: 'emp.transfer', department_id: 'emp.transfer', team_id: 'emp.transfer',
  position_id: 'emp.position', supervisor_employee_id: 'emp.supervisor',
  status: 'emp.status', employee_type: 'emp.status',
  full_name: 'emp.sensitive', date_of_birth: 'emp.sensitive', national_id: 'emp.sensitive', passport_no: 'emp.sensitive', tin: 'emp.sensitive',
  religion: 'emp.sensitive', family_details: 'emp.sensitive', medical_notes: 'emp.sensitive',
};
const kindOf = (field, after, opts) => {
  if (field === 'status' && after.status === 'Terminated') return 'emp.termination';
  if (field === 'position_id') {
    if ((opts.seniorPositionIds || []).map(Number).includes(Number(after.position_id))) return 'emp.senior_appointment';
    if (opts.promotion) return 'emp.promotion';
  }
  return FIELD_KIND[field] || null;
};

/**
 * Split a change into what needs approval and what does not: { governed: { kind: fields }, direct: fields }.
 * A transfer carries the new position and supervisor with it, and a promotion or senior appointment carries
 * its pay, so one decision covers one real-world change (and the pending-conflict check is not tripped by
 * our own split).
 */
const groupChanges = (before, after, opts = {}) => {
  const governed = {};
  const direct = {};
  Object.keys(after).forEach((k) => {
    if (sameValue(after[k], before[k])) return;
    const kind = kindOf(k, after, opts);
    if (kind) (governed[kind] = governed[kind] || {})[k] = after[k]; else direct[k] = after[k];
  });
  const fold = (into, from) => {
    if (!governed[into] || !governed[from]) return;
    Object.assign(governed[into], governed[from]);
    delete governed[from];
  };
  ['emp.position', 'emp.supervisor'].forEach((k) => fold('emp.transfer', k));
  ['emp.promotion', 'emp.senior_appointment'].forEach((into) => ['emp.salary', 'emp.supervisor', 'emp.transfer'].forEach((k) => fold(into, k)));
  return { governed, direct };
};
const changeKinds = (before, after, opts = {}) => Object.keys(groupChanges(before, after, opts).governed);

/** An existing login may become an employee's only if it is a staff account, never a customer's. */
const canLinkLogin = (user) => !user || !NON_STAFF.includes(user.role);

/** The chain above someone: supervisor, their supervisor, … (stops on a loop). `all` holds { id, supervisor_employee_id }. */
const upline = (all, employeeId) => {
  const byId = new Map(all.map((e) => [Number(e.id), e]));
  const out = [];
  let cur = byId.get(Number(employeeId));
  while (cur && cur.supervisor_employee_id != null) {
    const up = Number(cur.supervisor_employee_id);
    if (up === Number(employeeId) || out.includes(up)) break;
    out.push(up);
    cur = byId.get(up);
  }
  return out;
};

/**
 * M2 §13 "their team": direct and indirect reports, plus everyone in the departments, divisions and teams they run,
 * except the people above them (a CEO seated in a department is not that department manager's report).
 */
const teamIds = (all, employeeId, { departmentIds = [], divisionIds = [], teamIds: teams = [] } = {}) => {
  if (employeeId == null) return [];
  const me = Number(employeeId);
  const out = new Set();
  const walk = (id) => all.filter((e) => Number(e.supervisor_employee_id) === id).forEach((e) => { if (!out.has(e.id) && e.id !== me) { out.add(e.id); walk(Number(e.id)); } });
  walk(me);
  const has = (list, v) => list.map(Number).includes(Number(v));
  all.filter((e) => has(departmentIds, e.department_id) || has(divisionIds, e.division_id) || has(teams, e.team_id)).forEach((e) => out.add(e.id));
  out.delete(me);
  upline(all, me).forEach((id) => out.delete(id));
  return [...out];
};

/** Document types the employee's type requires that are not on file (a rejected upload does not count). */
const missingDocuments = (emp, docs = [], requiredByType = {}) => {
  const have = new Set(docs.filter((d) => d.verification_status !== 'rejected').map((d) => d.doc_type));
  return (requiredByType[emp.employee_type] || []).filter((t) => !have.has(t));
};

const day = (v) => { const d = new Date(v); d.setHours(0, 0, 0, 0); return d; };
const within = (date, now, days) => date && day(date) <= new Date(day(now).getTime() + days * 86400000);

/** What runs out within `days`: documents (expired ones too), contracts and probations. */
const expiring = (docs = [], employees = [], now = new Date(), days = 30) => {
  const today = day(now);
  const ahead = (v) => v && within(v, now, days) && day(v) >= today;
  return {
    documents: docs.filter((d) => d.expiry_date && within(d.expiry_date, now, days)).map((d) => ({ ...d, expired: day(d.expiry_date) < today })),
    contracts: employees.filter((e) => ahead(e.contract_end_date)),
    probations: employees.filter((e) => ahead(e.probation_end_date)),
  };
};

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dateOnly = (v) => (typeof v === 'string' ? v.slice(0, 10) : ymd(new Date(v)));
/** Monday of the week `now` falls in: standing problems are repeated once a week. */
const weekOf = (now) => { const d = day(now); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };

/**
 * Plan Task 12 (M2 §11, M1 §9): the reminders due today, minus those already sent. Dated events (probation ends
 * in 14 days, contract ends or a document expires in 30) are sent once per date; standing problems (missing
 * documents, a department without a manager, a position without a supervisor) once a week.
 * `sent` holds hr_reminders_sent rows { kind, employee_id, entity_id, due_on }. Only people on the roster count.
 */
const dueReminders = ({ employees = [], documents = [], orgAlerts = {}, requiredByType = {}, sent = [], now = new Date() } = {}) => {
  const current = employees.filter(onRoster);
  const ids = new Set(current.map((e) => Number(e.id)));
  const week = weekOf(now);
  const toBoth = ['hr_manager', 'manager'];
  const out = [];
  const { documents: docs, contracts } = expiring(documents.filter((d) => d.verification_status !== 'rejected' && ids.has(Number(d.employee_id))), current, now, 30);
  current.filter((e) => e.probation_end_date && within(e.probation_end_date, now, 14) && day(e.probation_end_date) >= day(now))
    .forEach((e) => out.push({ kind: 'probation_end', employeeId: e.id, dueOn: dateOnly(e.probation_end_date), recipients: toBoth }));
  contracts.forEach((e) => out.push({ kind: 'contract_expiry', employeeId: e.id, dueOn: dateOnly(e.contract_end_date), recipients: toBoth }));
  docs.forEach((d) => out.push({ kind: 'document_expiry', employeeId: d.employee_id, entityId: d.id, dueOn: dateOnly(d.expiry_date), recipients: toBoth, docType: d.doc_type, expired: d.expired }));
  current.forEach((e) => {
    const missing = missingDocuments(e, documents.filter((d) => Number(d.employee_id) === Number(e.id)), requiredByType);
    if (missing.length) out.push({ kind: 'missing_documents', employeeId: e.id, dueOn: week, recipients: ['hr_manager'], missing });
  });
  (orgAlerts.departmentsWithoutManager || []).forEach((id) => out.push({ kind: 'department_without_manager', entityId: id, dueOn: week, recipients: ['hr_manager'] }));
  (orgAlerts.positionsWithoutSupervisor || []).forEach((id) => out.push({ kind: 'position_without_supervisor', entityId: id, dueOn: week, recipients: ['hr_manager'] }));
  const done = new Set(sent.map((x) => `${x.kind}:${x.employee_id || ''}:${x.entity_id || ''}:${dateOnly(x.due_on)}`));
  return out.filter((x) => !done.has(`${x.kind}:${x.employeeId || ''}:${x.entityId || ''}:${x.dueOn}`));
};

module.exports = { nextEmployeeCode, missingLinks, nextStatuses, sameValue, changeKinds, groupChanges, missingDocuments, expiring, onRoster, OFF_ROSTER, upline, teamIds, dueReminders, canLinkLogin, FIELD_KIND, MOVES };
