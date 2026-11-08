/**
 * HR organisation reports (M1 §8) and dashboard widgets (M1 §12), plan Task 7. Pure functions over the rows
 * the controller loads; unit-tested by scripts/testHrReports.js. Employees are counted when their status
 * holds a seat (Onboarding, Active, Probation, Confirmed, Suspended).
 */
const { SEAT_HOLDING_STATUSES } = require('../config/hrCatalog');

const active = (r) => r.is_active !== false;
const byId = (rows) => new Map(rows.map((r) => [Number(r.id), r]));
const seated = (employees) => employees.filter((e) => SEAT_HOLDING_STATUSES.includes(e.status));
const countBy = (rows, key) => rows.reduce((m, r) => m.set(Number(r[key]), (m.get(Number(r[key])) || 0) + 1), new Map());
const personName = (employees, id) => {
  if (!id) return 'None';
  const e = employees.find((x) => Number(x.id) === Number(id));
  return (e && (e.full_name || e.preferred_name)) || `Employee #${id}`;
};

const prepare = (data) => {
  const { divisions = [], departments = [], teams = [], positions = [], costCentres = [], employees = [] } = data;
  const people = seated(employees);
  return {
    divisions, departments, teams, positions, costCentres, employees, people,
    divById: byId(divisions), depById: byId(departments), posById: byId(positions),
    filledByPos: countBy(people, 'position_id'), byDep: countBy(people, 'department_id'), byDiv: countBy(people, 'division_id'),
  };
};
const seats = (p) => (p.headcount ?? 1);
const nameOf = (map, id, field = 'name') => (map.get(Number(id)) || {})[field] || '';

const headcountByDepartment = (d) => d.departments.filter(active)
  .map((dep) => ({ id: dep.id, name: dep.name, headcount: d.byDep.get(Number(dep.id)) || 0 }))
  .sort((a, b) => b.headcount - a.headcount || a.name.localeCompare(b.name));

/** M1 §12 widgets. */
const orgWidgets = (data, now = new Date()) => {
  const d = prepare(data);
  const livePositions = d.positions.filter(active);
  const sameMonth = (v) => { const t = new Date(v); return t.getFullYear() === now.getFullYear() && t.getMonth() === now.getMonth(); };
  return {
    divisions: d.divisions.filter(active).length,
    departments: d.departments.filter(active).length,
    inactiveDepartments: d.departments.filter((x) => !active(x)).length,
    activePositions: livePositions.length,
    vacantPositions: livePositions.filter((p) => seats(p) > (d.filledByPos.get(Number(p.id)) || 0)).length,
    departmentsWithoutManager: d.departments.filter((x) => active(x) && !x.manager_employee_id).length,
    positionsWithoutJd: livePositions.filter((p) => !String(p.job_description || '').trim()).length,
    newPositionsThisMonth: livePositions.filter((p) => sameMonth(p.created_at || p.createdAt)).length,
    headcountByDepartment: headcountByDepartment(d),
  };
};

const col = (key, label) => ({ key, label });
const REPORTS = {
  structure: {
    title: 'Organisation structure',
    columns: [col('division', 'Division'), col('department', 'Department'), col('team', 'Team'), col('position', 'Position'), col('code', 'Code'), col('seats', 'Seats'), col('filled', 'Filled')],
    rows: (d) => d.positions.filter(active).map((p) => {
      const dep = d.depById.get(Number(p.department_id)) || {};
      return {
        division: nameOf(d.divById, dep.division_id), department: dep.name || '', team: (d.teams.find((t) => Number(t.id) === Number(p.team_id)) || {}).name || '',
        position: p.title, code: p.code, seats: seats(p), filled: d.filledByPos.get(Number(p.id)) || 0,
      };
    }).sort((a, b) => a.division.localeCompare(b.division) || a.department.localeCompare(b.department) || a.position.localeCompare(b.position)),
  },
  departments: {
    title: 'Department list',
    columns: [col('code', 'Code'), col('name', 'Department'), col('division', 'Division'), col('manager', 'Manager'), col('headcount', 'Headcount'), col('status', 'Status')],
    rows: (d) => d.departments.map((x) => ({
      code: x.code, name: x.name, division: nameOf(d.divById, x.division_id), manager: personName(d.employees, x.manager_employee_id),
      headcount: d.byDep.get(Number(x.id)) || 0, status: active(x) ? 'Active' : 'Inactive',
    })),
  },
  positions: {
    title: 'Position list',
    columns: [col('code', 'Code'), col('title', 'Position'), col('department', 'Department'), col('reports_to', 'Reports to'), col('seats', 'Seats'), col('status', 'Status')],
    rows: (d) => d.positions.map((p) => ({
      code: p.code, title: p.title, department: nameOf(d.depById, p.department_id),
      reports_to: p.is_top ? 'Top of the company' : nameOf(d.posById, p.reports_to_position_id, 'title') || 'No supervisor',
      seats: seats(p), status: active(p) ? 'Active' : 'Inactive',
    })),
  },
  'reporting-lines': {
    title: 'Reporting lines',
    columns: [col('position', 'Position'), col('department', 'Department'), col('reports_to', 'Reports to')],
    rows: (d) => d.positions.filter(active).map((p) => ({
      position: p.title, department: nameOf(d.depById, p.department_id),
      reports_to: p.is_top ? 'Top of the company' : nameOf(d.posById, p.reports_to_position_id, 'title') || 'No supervisor',
    })),
  },
  'vacancy-by-department': {
    title: 'Vacancy by department',
    columns: [col('department', 'Department'), col('division', 'Division'), col('seats', 'Seats'), col('filled', 'Filled'), col('vacant', 'Vacant')],
    rows: (d) => d.departments.filter(active).map((dep) => {
      const ps = d.positions.filter((p) => active(p) && Number(p.department_id) === Number(dep.id));
      const total = ps.reduce((a, p) => a + seats(p), 0);
      const filled = ps.reduce((a, p) => a + Math.min(seats(p), d.filledByPos.get(Number(p.id)) || 0), 0);
      return { department: dep.name, division: nameOf(d.divById, dep.division_id), seats: total, filled, vacant: total - filled };
    }).sort((a, b) => b.vacant - a.vacant || a.department.localeCompare(b.department)),
  },
  'headcount-by-division': {
    title: 'Headcount by division',
    columns: [col('division', 'Division'), col('headcount', 'Headcount')],
    rows: (d) => d.divisions.filter(active).map((v) => ({ division: v.name, headcount: d.byDiv.get(Number(v.id)) || 0 }))
      .sort((a, b) => b.headcount - a.headcount || a.division.localeCompare(b.division)),
  },
  'headcount-by-department': {
    title: 'Headcount by department',
    columns: [col('department', 'Department'), col('division', 'Division'), col('headcount', 'Headcount')],
    rows: (d) => headcountByDepartment(d).map((x) => ({ department: x.name, division: nameOf(d.divById, (d.depById.get(Number(x.id)) || {}).division_id), headcount: x.headcount })),
  },
  'position-status': {
    title: 'Active and inactive positions',
    columns: [col('code', 'Code'), col('title', 'Position'), col('department', 'Department'), col('status', 'Status')],
    rows: (d) => [...d.positions].sort((a, b) => Number(active(b)) - Number(active(a)) || Number(a.id) - Number(b.id))
      .map((p) => ({ code: p.code, title: p.title, department: nameOf(d.depById, p.department_id), status: active(p) ? 'Active' : 'Inactive' })),
  },
  'cost-centres': {
    title: 'Cost centres',
    columns: [col('code', 'Code'), col('name', 'Cost centre'), col('departments', 'Departments'), col('headcount', 'Headcount'), col('status', 'Status')],
    rows: (d) => d.costCentres.map((c) => {
      const deps = d.departments.filter((x) => active(x) && Number(x.cost_centre_id) === Number(c.id));
      return { code: c.code, name: c.name, departments: deps.length, headcount: deps.reduce((a, x) => a + (d.byDep.get(Number(x.id)) || 0), 0), status: active(c) ? 'Active' : 'Inactive' };
    }),
  },
};
const REPORT_KINDS = Object.keys(REPORTS);

/** One M1 §8 report: { kind, title, columns: [{key,label}], rows[] }. */
const orgReport = (kind, data) => {
  const r = REPORTS[kind];
  if (!r) throw Object.assign(new Error('Unknown report'), { status: 404 });
  return { kind, title: r.title, columns: r.columns, rows: r.rows(prepare(data)) };
};

// Text that starts like a formula gets a leading ' so a spreadsheet shows it instead of running it.
const cell = (v) => {
  let s = v == null ? '' : String(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = ({ columns, rows }) => [columns.map((c) => cell(c.label)), ...rows.map((r) => columns.map((c) => cell(r[c.key])))]
  .map((line) => `${line.join(',')}\r\n`).join('');

/* ── Employee Master reports and widgets (plan Task 15; M2 §14, §15) ─────────────────────────────── */

const emp = require('./hrEmployee.service');

const ymd = (d) => d.toISOString().slice(0, 10);
const dateOf = (v) => (v ? String(v instanceof Date ? ymd(v) : v).slice(0, 10) : null);
const current = (employees) => employees.filter((e) => !e.archived_at && e.status !== 'Applicant');
const LEFT = emp.OFF_ROSTER.filter((s) => s !== 'Applicant');
const round1 = (n) => Math.round(n * 10) / 10;
const monthsBetween = (from, to) => {
  const a = new Date(`${dateOf(from)}T00:00:00Z`);
  const b = new Date(`${dateOf(to)}T00:00:00Z`);
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth()) - (b.getUTCDate() < a.getUTCDate() ? 1 : 0);
};
/** People on the books on a day: joined by then and not yet gone. */
const headcountOn = (employees, day) => employees.filter((e) => e.joining_date && dateOf(e.joining_date) <= day && !(e.exit_date && dateOf(e.exit_date) <= day)).length;
const tally = (rows, nameOf) => [...rows.reduce((m, r) => { const n = nameOf(r); if (n) m.set(n, (m.get(n) || 0) + 1); return m; }, new Map())]
  .map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
const docsOf = (documents, id) => documents.filter((d) => Number(d.employee_id) === Number(id));

const employeeWidgets = (data, now = new Date()) => {
  const { employees = [], departments = [], documents = [], requiredByType = {} } = data;
  const deps = byId(departments);
  const all = current(employees);
  const on = all.filter(emp.onRoster);
  const today = ymd(now);
  const month = today.slice(0, 7);
  const soon = emp.expiring(documents.filter((d) => d.verification_status !== 'rejected' && on.some((e) => Number(e.id) === Number(d.employee_id))), on, now, 60);
  const within = (v, days) => v && dateOf(v) >= today && dateOf(v) <= ymd(new Date(now.getTime() + days * 86400000));
  const g = (v) => String(v || '').toLowerCase();

  // Turnover per month for the last 12 months: leavers ÷ average of the headcount at the start and the end × 100.
  const turnoverTrend = Array.from({ length: 12 }, (_, i) => {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    const key = ymd(start).slice(0, 7);
    const leavers = employees.filter((e) => e.exit_date && dateOf(e.exit_date).slice(0, 7) === key).length;
    const dayBefore = ymd(new Date(start.getTime() - 86400000));
    const averageHeadcount = (headcountOn(employees, dayBefore) + headcountOn(employees, ymd(end))) / 2;
    return { month: key, leavers, averageHeadcount, rate: averageHeadcount ? round1((leavers / averageHeadcount) * 100) : 0 };
  });
  const tenures = on.filter((e) => e.joining_date && dateOf(e.joining_date) <= today).map((e) => monthsBetween(e.joining_date, now));
  return {
    totalEmployees: all.length,
    activeEmployees: on.length,
    onProbation: on.filter((e) => e.status === 'Probation').length,
    newJoinersThisMonth: all.filter((e) => dateOf(e.joining_date) && dateOf(e.joining_date).slice(0, 7) === month).length,
    byDepartment: tally(on, (e) => nameOf(deps, e.department_id) || null),
    byType: tally(on, (e) => e.employee_type || null),
    missingDocuments: on.filter((e) => emp.missingDocuments(e, docsOf(documents, e.id), requiredByType).length).length,
    expiringDocuments: emp.expiring(documents.filter((d) => d.verification_status !== 'rejected' && on.some((e) => Number(e.id) === Number(d.employee_id))), [], now, 30).documents.length,
    contractExpiry: soon.contracts.length,
    probationReviewDue: on.filter((e) => e.status === 'Probation' && within(e.probation_end_date, 14)).length,
    genderRatio: {
      male: on.filter((e) => g(e.gender) === 'male').length, female: on.filter((e) => g(e.gender) === 'female').length,
      other: on.filter((e) => e.gender && !['male', 'female'].includes(g(e.gender))).length, unknown: on.filter((e) => !e.gender).length,
    },
    averageTenureMonths: tenures.length ? round1(tenures.reduce((a, b) => a + b, 0) / tenures.length) : 0,
    turnoverTrend,
  };
};

const person = [col('employee_code', 'Employee ID'), col('full_name', 'Name')];
const EMPLOYEE_REPORTS = {
  'employee-master': {
    title: 'Employee master', columns: [...person, col('position', 'Position'), col('department', 'Department'), col('employee_type', 'Type'), col('status', 'Status'), col('joining_date', 'Joined'), col('work_email', 'Work email'), col('personal_mobile', 'Mobile')],
    rows: (d) => d.people.map((e) => ({ ...d.base(e), employee_type: e.employee_type || '', status: e.status, joining_date: dateOf(e.joining_date) || '', work_email: e.work_email || '', personal_mobile: e.personal_mobile || '' })),
  },
  'active-employees': {
    title: 'Active employees', columns: [...person, col('position', 'Position'), col('department', 'Department'), col('status', 'Status'), col('joining_date', 'Joined')],
    rows: (d) => d.people.filter(emp.onRoster).map((e) => ({ ...d.base(e), status: e.status, joining_date: dateOf(e.joining_date) || '' })),
  },
  'inactive-employees': {
    title: 'Inactive employees', columns: [...person, col('department', 'Department'), col('status', 'Status'), col('exit_date', 'Left')],
    rows: (d) => d.people.filter((e) => LEFT.includes(e.status)).map((e) => ({ ...d.base(e), status: e.status, exit_date: dateOf(e.exit_date) || '' })),
  },
  probation: {
    title: 'Employees on probation', columns: [...person, col('position', 'Position'), col('department', 'Department'), col('joining_date', 'Joined'), col('probation_end_date', 'Probation ends')],
    rows: (d) => d.people.filter((e) => e.status === 'Probation').map((e) => ({ ...d.base(e), joining_date: dateOf(e.joining_date) || '', probation_end_date: dateOf(e.probation_end_date) || '' })),
  },
  'new-joiners': {
    title: 'New joiners (last 90 days)', columns: [...person, col('position', 'Position'), col('department', 'Department'), col('joining_date', 'Joined'), col('status', 'Status')],
    rows: (d) => d.people.filter((e) => dateOf(e.joining_date) && dateOf(e.joining_date) >= d.daysAgo(90) && dateOf(e.joining_date) <= d.today)
      .map((e) => ({ ...d.base(e), joining_date: dateOf(e.joining_date), status: e.status })),
  },
  'department-headcount': {
    title: 'Headcount by department', columns: [col('department', 'Department'), col('active', 'Active'), col('probation', 'On probation'), col('total', 'On the master')],
    rows: (d) => d.departments.map((dep) => {
      const here = d.people.filter((e) => Number(e.department_id) === Number(dep.id));
      return { department: dep.name, active: here.filter(emp.onRoster).length, probation: here.filter((e) => e.status === 'Probation').length, total: here.length };
    }),
  },
  'employee-types': {
    title: 'Employees by type', columns: [col('employee_type', 'Employee type'), col('active', 'Active'), col('total', 'On the master')],
    rows: (d) => [...new Set(d.people.map((e) => e.employee_type).filter(Boolean))].sort().map((t) => {
      const here = d.people.filter((e) => e.employee_type === t);
      return { employee_type: t, active: here.filter(emp.onRoster).length, total: here.length };
    }),
  },
  'contract-expiry': {
    title: 'Contracts ending in the next 60 days', columns: [...person, col('department', 'Department'), col('employee_type', 'Type'), col('contract_end_date', 'Contract ends')],
    rows: (d) => emp.expiring([], d.people.filter(emp.onRoster), d.now, 60).contracts.map((e) => ({ ...d.base(e), employee_type: e.employee_type || '', contract_end_date: dateOf(e.contract_end_date) })),
  },
  'missing-documents': {
    title: 'Missing documents', columns: [...person, col('department', 'Department'), col('employee_type', 'Type'), col('missing', 'Missing')],
    rows: (d) => d.people.filter(emp.onRoster).map((e) => ({ e, missing: emp.missingDocuments(e, docsOf(d.documents, e.id), d.requiredByType) })).filter((x) => x.missing.length)
      .map(({ e, missing }) => ({ ...d.base(e), employee_type: e.employee_type || '', missing: missing.join(', ') })),
  },
  'document-expiry': {
    title: 'Documents expiring in the next 60 days (and expired)', columns: [...person, col('doc_type', 'Document'), col('expiry_date', 'Expires'), col('state', 'State')],
    rows: (d) => emp.expiring(d.documents.filter((x) => x.verification_status !== 'rejected'), [], d.now, 60).documents
      .map((x) => ({ x, e: d.people.find((p) => Number(p.id) === Number(x.employee_id)) })).filter(({ e }) => e && emp.onRoster(e))
      .map(({ x, e }) => ({ employee_code: e.employee_code, full_name: e.full_name, doc_type: x.doc_type, expiry_date: dateOf(x.expiry_date), state: x.expired ? 'Expired' : 'Expiring' })),
  },
  'salary-grades': {
    title: 'Employees by salary grade', columns: [col('salary_grade', 'Salary grade'), col('employees', 'Employees')],
    rows: (d) => tally(d.people.filter(emp.onRoster), (e) => nameOf(d.grades, e.salary_grade_id) || 'Not set').map((x) => ({ salary_grade: x.name, employees: x.count })),
  },
  transfers: {
    title: 'Transfers', columns: [...person, col('date', 'Date'), col('from', 'From'), col('to', 'To')],
    rows: (d) => d.history.filter((h) => h.field === 'department_id' && h.old_value != null && h.old_value !== '').map((h) => {
      const e = d.ids.get(Number(h.entity_id)) || {};
      return { employee_code: e.employee_code || '', full_name: e.full_name || '', date: dateOf(h.at) || '', from: nameOf(d.deps, h.old_value) || `#${h.old_value}`, to: nameOf(d.deps, h.new_value) || `#${h.new_value}` };
    }),
  },
  'employee-history': {
    title: 'Employee history', columns: [...person, col('date', 'Date'), col('field', 'Field'), col('old_value', 'Was'), col('new_value', 'Now')],
    rows: (d) => d.history.map((h) => {
      const e = d.ids.get(Number(h.entity_id)) || {};
      return { employee_code: e.employee_code || '', full_name: e.full_name || '', date: dateOf(h.at) || '', field: String(h.field || '').replace(/_/g, ' '), old_value: h.old_value ?? '', new_value: h.new_value ?? '' };
    }),
  },
  'emergency-contacts': {
    title: 'Emergency contacts', columns: [...person, col('department', 'Department'), col('contact', 'Contact'), col('relationship', 'Relationship'), col('phone', 'Phone')],
    rows: (d) => d.people.filter(emp.onRoster).map((e) => ({ ...d.base(e), contact: e.emergency_contact_name || '', relationship: e.emergency_contact_relationship || '', phone: e.emergency_contact_phone || '' })),
  },
};
const EMPLOYEE_REPORT_KINDS = Object.keys(EMPLOYEE_REPORTS);

/** One M2 §14 report: { title, columns, rows }. `data` holds employees, departments, positions, documents, history, salaryGrades, requiredByType, now. */
const employeeReport = (kind, data) => {
  const def = EMPLOYEE_REPORTS[kind];
  if (!def) throw Object.assign(new Error('Unknown report'), { status: 404 });
  const now = data.now || new Date();
  const deps = byId(data.departments || []);
  const positions = byId(data.positions || []);
  const people = current(data.employees || []).sort((a, b) => String(a.full_name).localeCompare(String(b.full_name)));
  const d = {
    now, people, deps, departments: (data.departments || []).filter(active), documents: data.documents || [], requiredByType: data.requiredByType || {},
    grades: byId(data.salaryGrades || []), ids: byId(data.employees || []), history: (data.history || []).filter((h) => h.entity_type === 'employee'),
    today: ymd(now), daysAgo: (n) => ymd(new Date(now.getTime() - n * 86400000)),
    base: (e) => ({ employee_code: e.employee_code, full_name: e.full_name, position: nameOf(positions, e.position_id, 'title'), department: nameOf(deps, e.department_id) }),
  };
  return { title: def.title, columns: def.columns, rows: def.rows(d) };
};

/* ── Recruitment (M3 §18 reports, §19 dashboard) ─────────────────────────── */

const DAY = 86400000;
const median = (xs) => {
  if (!xs.length) return null;
  const v = [...xs].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : round1((v[m - 1] + v[m]) / 2);
};
const pct = (n, d) => (d ? round1((n / d) * 100) : null);
const reached = (events, status) => new Set(events.filter((e) => e.kind === 'status' && e.to_status === status).map((e) => Number(e.application_id)));

const prepRec = (data) => {
  const now = data.now || new Date();
  const applications = data.applications || [];
  const offers = data.offers || [];
  const events = data.events || [];
  const vacancies = data.vacancies || [];
  const positions = byId(data.positions || []);
  const deps = byId(data.departments || []);
  const accepted = offers.filter((o) => o.status === 'accepted');
  const appOf = byId(applications);
  // Days from application to the offer being accepted, per accepted offer (M3 §19 "Average Time to Hire").
  const hireDays = accepted.map((o) => {
    const a = appOf.get(Number(o.application_id));
    return a && a.applied_at && o.accepted_at ? Math.round((new Date(o.accepted_at) - new Date(a.applied_at)) / DAY) : null;
  }).filter((n) => n != null);
  const jds = byId(data.jobDescriptions || []);
  // A vacancy is called by its job description's title when it has one, as on the careers page.
  const title = (v) => nameOf(jds, v.job_description_id, 'title') || nameOf(positions, v.position_id, 'title') || v.vacancy_code;
  const age = (v) => (v.published_at ? Math.floor((now - new Date(v.published_at)) / DAY) : null);
  const ofVacancy = (v) => applications.filter((a) => Number(a.vacancy_id) === Number(v.id));
  const offerOf = (a) => offers.filter((o) => Number(o.application_id) === Number(a.id));
  return { now, applications, offers, events, vacancies, deps, positions, accepted, hireDays, title, age, ofVacancy, offerOf, interviews: data.interviews || [], candidates: data.candidates || [] };
};

const STAGE_OF = [['Applied', ['Application Received']], ['Screening', ['Under Review']], ['Shortlisted', ['Shortlisted']], ['Interview', ['Interview Scheduled', 'Interview Completed']],
  ['Assessment', ['Assessment Pending', 'Assessment Completed']], ['Checks', ['Reference Check']], ['Offer', ['Offer Pending', 'Offer Sent', 'Offer Accepted']]];
const stageOf = (status) => (STAGE_OF.find(([, list]) => list.includes(status)) || [status])[0];
const furthestStage = (apps) => {
  let best = -1;
  apps.forEach((a) => { const i = STAGE_OF.findIndex(([, list]) => list.includes(a.status)); if (i > best) best = i; });
  return best < 0 ? '—' : STAGE_OF[best][0];
};

const recruitmentWidgets = (data, now = data.now || new Date()) => {
  const d = prepRec({ ...data, now });
  const open = d.vacancies.filter((v) => v.status === 'published');
  const hires = d.applications.filter((a) => a.hired_employee_id).length;
  const cost = d.vacancies.reduce((t, v) => t + Number(v.cost_amount || 0), 0);
  const declined = d.offers.filter((o) => o.status === 'declined').length;
  return {
    openVacancies: open.length,
    criticalOpen: open.filter((v) => v.priority === 'Critical').length,
    applicationsReceived: d.applications.length,
    shortlisted: reached(d.events, 'Shortlisted').size,
    interviewsScheduled: d.interviews.filter((i) => i.status === 'scheduled' && new Date(i.scheduled_at) >= now).length,
    offersPending: d.applications.filter((a) => ['Offer Pending', 'Offer Sent'].includes(a.status)).length,
    offersAccepted: d.accepted.length,
    vacanciesFilled: d.vacancies.reduce((t, v) => t + Number(v.filled_count || 0), 0),
    timeToHireDays: median(d.hireDays),
    recruitmentCost: cost,
    costPerHire: hires ? Math.round(cost / hires) : null,
    offerAcceptanceRate: pct(d.accepted.length, d.accepted.length + declined),
    sources: tally(d.applications, (a) => a.source || 'Not recorded'),
    talentPoolSize: d.candidates.filter((c) => c.in_talent_pool).length,
    pipeline: STAGE_OF.map(([name]) => ({ name, count: d.applications.filter((a) => stageOf(a.status) === name).length })),
    openVacancyRows: open.map((v) => {
      const apps = d.ofVacancy(v);
      return { vacancy_code: v.vacancy_code, title: d.title(v), department: nameOf(d.deps, v.department_id), priority: v.priority, positions: v.positions_count, applicants: apps.length, stage: furthestStage(apps), ageDays: d.age(v) };
    }).sort((a, b) => (b.ageDays ?? 0) - (a.ageDays ?? 0)),
  };
};

const vac = [col('vacancy_code', 'Vacancy'), col('title', 'Title')];
const RECRUITMENT_REPORTS = {
  pipeline: {
    title: 'Recruitment pipeline', columns: [...vac, ...STAGE_OF.map(([n]) => col(n.toLowerCase(), n)), col('closed', 'Closed')],
    rows: (d) => d.vacancies.map((v) => {
      const apps = d.ofVacancy(v);
      return { vacancy_code: v.vacancy_code, title: d.title(v), ...Object.fromEntries(STAGE_OF.map(([n]) => [n.toLowerCase(), apps.filter((a) => stageOf(a.status) === n).length])), closed: apps.filter((a) => ['Not Selected', 'Offer Declined', 'Talent Pool'].includes(a.status)).length };
    }),
  },
  'vacancies-by-department': {
    title: 'Vacancies by department', columns: [col('department', 'Department'), col('open', 'Open'), col('positions', 'Positions open'), col('filled', 'Filled'), col('closed', 'Closed')],
    rows: (d) => [...new Set(d.vacancies.map((v) => Number(v.department_id)))].map((id) => {
      const here = d.vacancies.filter((v) => Number(v.department_id) === id);
      const open = here.filter((v) => v.status === 'published');
      return { department: nameOf(d.deps, id) || 'Not set', open: open.length, positions: open.reduce((t, v) => t + Math.max(0, Number(v.positions_count || 1) - Number(v.filled_count || 0)), 0), filled: here.reduce((t, v) => t + Number(v.filled_count || 0), 0), closed: here.filter((v) => ['closed', 'filled'].includes(v.status)).length };
    }),
  },
  'time-to-hire': {
    title: 'Time to hire', columns: [...vac, col('applied', 'Applied'), col('accepted', 'Offer accepted'), col('days', 'Days')],
    rows: (d) => d.accepted.map((o) => {
      const a = d.applications.find((x) => Number(x.id) === Number(o.application_id));
      const v = a && d.vacancies.find((x) => Number(x.id) === Number(a.vacancy_id));
      if (!a || !v) return null;
      return { vacancy_code: v.vacancy_code, title: d.title(v), applied: dateOf(a.applied_at) || '', accepted: dateOf(o.accepted_at) || '', days: a.applied_at && o.accepted_at ? Math.round((new Date(o.accepted_at) - new Date(a.applied_at)) / DAY) : '' };
    }).filter(Boolean),
  },
  'cost-per-hire': {
    title: 'Cost per hire', columns: [...vac, col('cost', 'Recruitment cost (Tk)'), col('hires', 'Hires'), col('per_hire', 'Per hire (Tk)')],
    rows: (d) => d.vacancies.map((v) => {
      const hires = d.ofVacancy(v).filter((a) => a.hired_employee_id).length;
      const cost = Number(v.cost_amount || 0);
      return { vacancy_code: v.vacancy_code, title: d.title(v), cost, hires, per_hire: hires ? Math.round(cost / hires) : '' };
    }),
  },
  sources: {
    title: 'Source of candidates', columns: [col('source', 'Source'), col('applications', 'Applications'), col('shortlisted', 'Shortlisted'), col('hired', 'Hired')],
    rows: (d) => {
      const short = reached(d.events, 'Shortlisted');
      return tally(d.applications, (a) => a.source || 'Not recorded').map(({ name }) => {
        const here = d.applications.filter((a) => (a.source || 'Not recorded') === name);
        return { source: name, applications: here.length, shortlisted: here.filter((a) => short.has(Number(a.id))).length, hired: here.filter((a) => a.hired_employee_id).length };
      });
    },
  },
  'interview-success': {
    title: 'Interview success rate', columns: [col('interviewed', 'Candidates interviewed'), col('reached_offer', 'Went on to an offer'), col('rate', 'Success rate (%)')],
    rows: (d) => {
      const interviewed = new Set(d.interviews.filter((i) => i.status === 'completed').map((i) => Number(i.application_id)));
      const offered = reached(d.events, 'Offer Pending');
      const n = [...interviewed].filter((id) => offered.has(id)).length;
      return [{ interviewed: interviewed.size, reached_offer: n, rate: pct(n, interviewed.size) ?? '' }];
    },
  },
  'offer-acceptance': {
    title: 'Offer acceptance rate', columns: [...vac, col('accepted', 'Accepted'), col('declined', 'Declined'), col('rate', 'Acceptance (%)')],
    rows: (d) => d.vacancies.map((v) => {
      const os = d.ofVacancy(v).flatMap(d.offerOf);
      const acc = os.filter((o) => o.status === 'accepted').length;
      const dec = os.filter((o) => o.status === 'declined').length;
      return { vacancy_code: v.vacancy_code, title: d.title(v), accepted: acc, declined: dec, rate: pct(acc, acc + dec) ?? '' };
    }).filter((r) => r.accepted + r.declined > 0),
  },
  status: {
    title: 'Recruitment status', columns: [...vac, col('candidate', 'Candidate'), col('status', 'Status'), col('source', 'Source'), col('applied', 'Applied')],
    rows: (d) => d.applications.map((a) => {
      const v = d.vacancies.find((x) => Number(x.id) === Number(a.vacancy_id)) || {};
      const c = d.candidates.find((x) => Number(x.id) === Number(a.candidate_id)) || {};
      return { vacancy_code: v.vacancy_code || '', title: v.id ? d.title(v) : '', candidate: c.full_name ? `${c.full_name} (${c.candidate_code})` : '', status: a.status, source: a.source || '', applied: dateOf(a.applied_at) || '' };
    }),
  },
  'talent-pool': {
    title: 'Talent pool', columns: [col('candidate_code', 'Candidate ID'), col('full_name', 'Name'), col('experience', 'Experience (years)'), col('qualification', 'Education'), col('location', 'Location'), col('availability', 'Availability')],
    rows: (d) => d.candidates.filter((c) => c.in_talent_pool).map((c) => ({ candidate_code: c.candidate_code, full_name: c.full_name, experience: c.years_experience ?? '', qualification: c.highest_qualification || '', location: c.location || '', availability: c.availability || '' })),
  },
  'vacancy-age': {
    title: 'Vacancy age (from publishing)', columns: [...vac, col('department', 'Department'), col('published', 'Published'), col('age_days', 'Age (days)'), col('applicants', 'Applicants')],
    rows: (d) => d.vacancies.filter((v) => v.status === 'published').map((v) => ({ vacancy_code: v.vacancy_code, title: d.title(v), department: nameOf(d.deps, v.department_id), published: dateOf(v.published_at) || '', age_days: d.age(v) ?? '', applicants: d.ofVacancy(v).length }))
      .sort((a, b) => (b.age_days || 0) - (a.age_days || 0)),
  },
};
const RECRUITMENT_REPORT_KINDS = Object.keys(RECRUITMENT_REPORTS);

/** One M3 §18 report: { title, columns, rows }. `data` holds vacancies, applications, offers, events, interviews, candidates, departments, positions, jobDescriptions, now. */
const recruitmentReport = (kind, data) => {
  const def = RECRUITMENT_REPORTS[kind];
  if (!def) throw Object.assign(new Error('Unknown report'), { status: 404 });
  return { title: def.title, columns: def.columns, rows: def.rows(prepRec(data)) };
};

module.exports = { REPORT_KINDS, orgReport, orgWidgets, toCsv, EMPLOYEE_REPORT_KINDS, employeeReport, employeeWidgets,
  RECRUITMENT_REPORT_KINDS, recruitmentReport, recruitmentWidgets,
};
