/**
 * HR organisation reports and dashboard widgets (plan Task 7; M1 §8, §12). Pure functions, no database.
 * Run from backend/: node scripts/testHrReports.js
 */
const assert = require('assert');
const { orgReport, orgWidgets, REPORT_KINDS, toCsv } = require('../services/hrReports.service');

const data = {
  companies: [{ id: 1, name: 'Seventh Sky Private Ltd' }],
  divisions: [{ id: 1, company_id: 1, code: 'DIV-0001', name: 'Property Care', is_active: true }, { id: 2, company_id: 1, code: 'DIV-0002', name: 'Corporate', is_active: true }],
  departments: [
    { id: 1, division_id: 1, code: 'DEP-0001', name: 'Water Tank Services', manager_employee_id: 1, cost_centre_id: 1, is_active: true },
    { id: 2, division_id: 1, code: 'DEP-0002', name: 'Solar Solutions', manager_employee_id: null, is_active: true },
    { id: 3, division_id: 2, code: 'DEP-0003', name: 'Event Services', manager_employee_id: null, is_active: false },
    { id: 4, division_id: 2, code: 'DEP-0004', name: 'Finance', manager_employee_id: 3, cost_centre_id: 1, is_active: true },
  ],
  teams: [],
  positions: [
    { id: 1, department_id: 1, code: 'POS-0001', title: 'Service Coordinator', headcount: 2, is_top: true, job_description: 'Runs jobs', is_active: true, created_at: '2026-10-03T08:00:00Z' },
    { id: 2, department_id: 1, code: 'POS-0002', title: 'Field Technician', headcount: 1, reports_to_position_id: 1, job_description: '', is_active: true, created_at: '2026-09-20T08:00:00Z' },
    { id: 3, department_id: 4, code: 'POS-0003', title: 'Accountant', headcount: 1, reports_to_position_id: 1, job_description: 'Books', is_active: true, created_at: '2026-10-29T08:00:00Z' },
    { id: 4, department_id: 2, code: 'POS-0004', title: 'Solar Installer', headcount: 1, reports_to_position_id: null, is_active: false, created_at: '2026-10-01T08:00:00Z' },
  ],
  costCentres: [{ id: 1, code: 'CC-0001', name: 'Operations', is_active: true }],
  employees: [
    { id: 1, position_id: 1, department_id: 1, division_id: 1, status: 'Active' },
    { id: 2, position_id: 2, department_id: 1, division_id: 1, status: 'Probation' },
    { id: 3, position_id: 3, department_id: 4, division_id: 2, status: 'Confirmed' },
    { id: 4, position_id: 2, department_id: 1, division_id: 1, status: 'Resigned' },
  ],
};
const now = new Date('2026-10-30T12:00:00Z');

// M1 §12 widgets
const w = orgWidgets(data, now);
assert.strictEqual(w.divisions, 2);
assert.strictEqual(w.departments, 3, 'active departments only');
assert.strictEqual(w.inactiveDepartments, 1);
assert.strictEqual(w.activePositions, 3);
assert.strictEqual(w.vacantPositions, 1, 'headcount-2 position with one active employee is 1 vacancy; resigned people do not fill seats');
assert.strictEqual(w.departmentsWithoutManager, 1, 'inactive departments are not counted');
assert.strictEqual(w.positionsWithoutJd, 1);
assert.strictEqual(w.newPositionsThisMonth, 2, 'POS-0001 and POS-0003 were created in October 2026; inactive ones are not counted');
assert.deepStrictEqual(w.headcountByDepartment.map((d) => [d.name, d.headcount]), [['Water Tank Services', 2], ['Finance', 1], ['Solar Solutions', 0]]);
assert.strictEqual(orgWidgets(data, new Date('2026-11-02T00:00:00Z')).newPositionsThisMonth, 0, 'month follows now');

// M1 §8 reports
assert.deepStrictEqual(REPORT_KINDS, ['structure', 'departments', 'positions', 'reporting-lines', 'vacancy-by-department', 'headcount-by-division', 'headcount-by-department', 'position-status', 'cost-centres']);
REPORT_KINDS.forEach((k) => {
  const r = orgReport(k, data);
  assert.ok(r.title && Array.isArray(r.columns) && r.columns.length && Array.isArray(r.rows), k);
  r.rows.forEach((row) => r.columns.forEach((c) => assert.ok(c.key in row, `${k}: row lacks ${c.key}`)));
});
const byDiv = orgReport('headcount-by-division', data).rows;
assert.strictEqual(byDiv.reduce((a, r) => a + r.headcount, 0), 3, 'rows sum to active employees');
assert.deepStrictEqual(orgReport('vacancy-by-department', data).rows.find((r) => r.department === 'Water Tank Services'), { department: 'Water Tank Services', division: 'Property Care', seats: 3, filled: 2, vacant: 1 });
assert.deepStrictEqual(orgReport('position-status', data).rows.map((r) => r.status), ['Active', 'Active', 'Active', 'Inactive']);
const lines = orgReport('reporting-lines', data).rows;
assert.strictEqual(lines.find((r) => r.position === 'Field Technician').reports_to, 'Service Coordinator');
assert.strictEqual(lines.find((r) => r.position === 'Service Coordinator').reports_to, 'Top of the company');
assert.strictEqual(orgReport('cost-centres', data).rows[0].departments, 2);
assert.throws(() => orgReport('nope', data), (e) => e.status === 404);

// CSV escapes commas, quotes and new lines
assert.strictEqual(toCsv({ columns: [{ key: 'a', label: 'Name' }, { key: 'b', label: 'Note' }], rows: [{ a: 'Smith, J', b: 'said "hi"\nok' }] }),
  'Name,Note\r\n"Smith, J","said ""hi""\nok"\r\n');

// A name typed as a formula stays text in Excel (CSV injection)
assert.strictEqual(toCsv({ columns: [{ key: 'a', label: 'Name' }], rows: [{ a: '=HYPERLINK("x")' }, { a: '+1' }, { a: '-5' }, { a: '@SUM(A1)' }, { a: -5 }] }),
  `Name\r\n"'=HYPERLINK(""x"")"\r\n'+1\r\n'-5\r\n'@SUM(A1)\r\n-5\r\n`);

// ── Employee reports and widgets (plan Task 15; M2 §14, §15) ──
{
  const { EMPLOYEE_REPORT_KINDS, employeeReport, employeeWidgets } = require('../services/hrReports.service');
  const now = new Date('2026-10-15T00:00:00Z');
  const emp = (id, extra) => ({ id, employee_code: `SSPC-EMP-000${id}`, full_name: `Person ${id}`, employee_type: 'Full-time employee', department_id: 1, status: 'Active', ...extra });

  // Average tenure counts active employees only: 12 and 24 months → 18
  const tenure = employeeWidgets({ employees: [emp(1, { joining_date: '2025-10-15' }), emp(2, { joining_date: '2024-10-15' }), emp(3, { joining_date: '2016-10-15', status: 'Resigned', exit_date: '2026-01-01' })] }, now);
  assert.strictEqual(tenure.averageTenureMonths, 18);
  const future = employeeWidgets({ employees: [emp(1, { joining_date: '2025-10-15' }), emp(2, { joining_date: '2024-10-15' }), emp(4, { joining_date: '2026-11-01', status: 'Onboarding' })] }, now);
  assert.strictEqual(future.averageTenureMonths, 18, 'someone who has not started yet has no tenure');

  // Turnover: one leaver in a month with an average of 10 people → 10 (%)
  const ten = Array.from({ length: 10 }, (_, i) => emp(i + 1, { joining_date: '2020-01-01' }));
  ten.push(emp(11, { joining_date: '2020-01-01', status: 'Resigned', exit_date: '2026-10-31' }));   // leaves at the very end of October
  const trend = employeeWidgets({ employees: ten }, now).turnoverTrend;
  assert.strictEqual(trend.length, 12);
  assert.deepStrictEqual(trend[11], { month: '2026-10', leavers: 1, averageHeadcount: 10.5, rate: 9.5 });
  const exact = employeeWidgets({ employees: [...ten.slice(0, 9), emp(11, { joining_date: '2020-01-01', status: 'Resigned', exit_date: '2026-10-16' }), emp(12, { joining_date: '2026-10-16' })] }, now).turnoverTrend[11];
  assert.strictEqual(exact.rate, 10, 'one leaver, average headcount 10');
  assert.strictEqual(trend[10].month, '2026-09');

  // Contract expiry rows only include contracts ending within 60 days
  const contracts = employeeReport('contract-expiry', { employees: [emp(1, { contract_end_date: '2026-11-30' }), emp(2, { contract_end_date: '2027-01-30' }), emp(3, { contract_end_date: '2026-10-01' })], now });
  assert.deepStrictEqual(contracts.rows.map((r) => r.employee_code), ['SSPC-EMP-0001']);

  // Widgets
  const people = [
    emp(1, { gender: 'Female', joining_date: '2026-10-02', status: 'Probation', probation_end_date: '2026-10-20' }),
    emp(2, { gender: 'Male', joining_date: '2025-01-01', employee_type: 'Intern', department_id: 2 }),
    emp(3, { gender: 'Male', joining_date: '2024-01-01', status: 'Inactive', exit_date: '2026-03-01' }),
    emp(4, { joining_date: '2024-01-01', contract_end_date: '2026-11-01' }),
  ];
  const data = {
    employees: people, now,
    departments: [{ id: 1, name: 'Water Tank Services' }, { id: 2, name: 'Finance' }],
    documents: [{ id: 1, employee_id: 1, doc_type: 'Passport', expiry_date: '2026-10-30' }, { id: 2, employee_id: 2, doc_type: 'CV' }],
    requiredByType: { 'Full-time employee': ['CV'] },
  };
  const w = employeeWidgets(data, now);
  assert.strictEqual(w.totalEmployees, 4);
  assert.strictEqual(w.activeEmployees, 3);
  assert.strictEqual(w.onProbation, 1);
  assert.strictEqual(w.newJoinersThisMonth, 1);
  assert.deepStrictEqual(w.byDepartment, [{ name: 'Water Tank Services', count: 2 }, { name: 'Finance', count: 1 }]);
  assert.deepStrictEqual(w.byType, [{ name: 'Full-time employee', count: 2 }, { name: 'Intern', count: 1 }]);
  assert.strictEqual(w.missingDocuments, 2, 'people 1 and 4 have no CV; the intern type requires none');
  assert.strictEqual(w.expiringDocuments, 1);
  assert.strictEqual(w.contractExpiry, 1);
  assert.strictEqual(w.probationReviewDue, 1);
  assert.deepStrictEqual(w.genderRatio, { male: 1, female: 1, other: 0, unknown: 1 });

  // M2 §14: fourteen reports, each row carrying every column
  assert.strictEqual(EMPLOYEE_REPORT_KINDS.length, 14);
  const history = [{ entity_type: 'employee', entity_id: 2, field: 'department_id', old_value: '1', new_value: '2', at: '2026-05-01' }, { entity_type: 'employee', entity_id: 2, field: 'city', old_value: 'a', new_value: 'b', at: '2026-05-02' }];
  EMPLOYEE_REPORT_KINDS.forEach((k) => {
    const r = employeeReport(k, { ...data, history, salaryGrades: [{ id: 1, name: 'Grade 3' }] });
    assert.ok(r.title && r.columns.length && Array.isArray(r.rows), k);
    r.rows.forEach((row) => r.columns.forEach((c) => assert.ok(c.key in row, `${k}: row lacks ${c.key}`)));
  });
  assert.deepStrictEqual(employeeReport('inactive-employees', data).rows.map((r) => r.employee_code), ['SSPC-EMP-0003']);
  assert.deepStrictEqual(employeeReport('transfers', { ...data, history }).rows.map((r) => [r.from, r.to]), [['Water Tank Services', 'Finance']]);
  assert.strictEqual(employeeReport('missing-documents', data).rows.length, 2);
  assert.throws(() => employeeReport('nope', data), (e) => e.status === 404);
}

// ── Recruitment (plan Task 22; M3 §18 reports, §19 dashboard) ────────────────
{
  const { recruitmentWidgets, recruitmentReport, RECRUITMENT_REPORT_KINDS } = require('../services/hrReports.service');
  const now = new Date('2026-10-30T06:00:00Z');
  const day = (n) => new Date(now.getTime() - n * 86400000).toISOString();
  const vacancies = [
    { id: 1, vacancy_code: 'VAC-2026-0001', department_id: 1, position_id: 1, status: 'published', priority: 'Critical', positions_count: 2, filled_count: 1, cost_amount: 9000, published_at: day(10), createdAt: day(40) },
    { id: 2, vacancy_code: 'VAC-2026-0002', department_id: 2, position_id: 2, status: 'filled', priority: 'Normal', positions_count: 1, filled_count: 1, cost_amount: 6000, published_at: day(60), createdAt: day(70) },
    { id: 3, vacancy_code: 'VAC-2026-0003', department_id: 1, position_id: 1, status: 'published', priority: 'High', positions_count: 1, filled_count: 0, cost_amount: 0, published_at: day(3), createdAt: day(30) },
  ];
  const app = (id, vacancy_id, status, source, applied, extra = {}) => ({ id, vacancy_id, candidate_id: id, status, source, applied_at: day(applied), ...extra });
  const applications = [
    app(1, 1, 'Offer Accepted', 'Careers Portal', 50, { hired_employee_id: 9 }),
    app(2, 2, 'Offer Accepted', 'LinkedIn', 60, { hired_employee_id: 10 }),
    app(3, 1, 'Offer Accepted', 'Careers Portal', 45),
    app(4, 1, 'Offer Declined', 'Bdjobs', 30),
    app(5, 3, 'Shortlisted', 'Careers Portal', 2),
    app(6, 3, 'Application Received', 'Referral', 1),
    app(7, 1, 'Offer Sent', 'LinkedIn', 20),
  ];
  // Hires after 10, 20 and 40 days: the median time to hire is 20.
  const offers = [
    { application_id: 1, status: 'accepted', accepted_at: new Date(new Date(applications[0].applied_at).getTime() + 10 * 86400000).toISOString() },
    { application_id: 2, status: 'accepted', accepted_at: new Date(new Date(applications[1].applied_at).getTime() + 40 * 86400000).toISOString() },
    { application_id: 3, status: 'accepted', accepted_at: new Date(new Date(applications[2].applied_at).getTime() + 20 * 86400000).toISOString() },
    { application_id: 4, status: 'declined', declined_at: day(5) },
    { application_id: 7, status: 'sent', sent_at: day(1) },
  ];
  const ev = (application_id, to_status) => ({ application_id, kind: 'status', to_status });
  const events = [1, 2, 3, 4, 7].flatMap((i) => [ev(i, 'Shortlisted'), ev(i, 'Interview Completed'), ev(i, 'Offer Pending')]).concat([ev(5, 'Shortlisted')]);
  const interviews = [
    { application_id: 1, status: 'completed', scheduled_at: day(40) }, { application_id: 4, status: 'completed', scheduled_at: day(20) },
    { application_id: 5, status: 'completed', scheduled_at: day(1) }, { application_id: 6, status: 'scheduled', scheduled_at: new Date(now.getTime() + 86400000).toISOString() },
    { application_id: 7, status: 'scheduled', scheduled_at: day(2) },   // in the past, still "scheduled": not upcoming
  ];
  const candidates = [{ id: 5, in_talent_pool: true, full_name: 'A', candidate_code: 'CAN-1' }, { id: 6, in_talent_pool: true, full_name: 'B', candidate_code: 'CAN-2' }, { id: 4, in_talent_pool: false }];
  const departments = [{ id: 1, name: 'Water Tank Services' }, { id: 2, name: 'Finance' }];
  const positions = [{ id: 1, title: 'Technician' }, { id: 2, title: 'Accountant' }];
  const data = { vacancies, applications, offers, events, interviews, candidates, departments, positions, now };

  const w = recruitmentWidgets(data, now);
  assert.strictEqual(w.timeToHireDays, 20, 'median of 10, 20 and 40 days');
  assert.strictEqual(w.offerAcceptanceRate, 75, '3 accepted, 1 declined');
  assert.strictEqual(w.openVacancies, 2);
  assert.strictEqual(w.criticalOpen, 1);
  assert.strictEqual(w.applicationsReceived, 7);
  assert.strictEqual(w.shortlisted, 6, 'everyone who reached Shortlisted');
  assert.strictEqual(w.interviewsScheduled, 1, 'only upcoming scheduled interviews');
  assert.strictEqual(w.offersPending, 1);
  assert.strictEqual(w.offersAccepted, 3);
  assert.strictEqual(w.vacanciesFilled, 2, 'positions filled across vacancies');
  assert.strictEqual(w.recruitmentCost, 15000);
  assert.strictEqual(w.costPerHire, 7500, 'cost ÷ hires transferred');
  assert.deepStrictEqual(w.sources[0], { name: 'Careers Portal', count: 3 });
  assert.strictEqual(w.talentPoolSize, 2);
  const v1 = w.openVacancyRows.find((r) => r.vacancy_code === 'VAC-2026-0001');
  assert.strictEqual(v1.ageDays, 10, 'vacancy age counts from publishing, not from creation');
  assert.strictEqual(v1.applicants, 4);
  assert.strictEqual(recruitmentWidgets({ now }, now).timeToHireDays, null, 'no hires, no median');
  assert.strictEqual(recruitmentWidgets({ now }, now).offerAcceptanceRate, null);

  // M3 §18: ten reports, each row carrying every column
  assert.strictEqual(RECRUITMENT_REPORT_KINDS.length, 10);
  RECRUITMENT_REPORT_KINDS.forEach((k) => {
    const r = recruitmentReport(k, data);
    assert.ok(r.title && r.columns.length && Array.isArray(r.rows), k);
    r.rows.forEach((row) => r.columns.forEach((c) => assert.ok(c.key in row, `${k}: row lacks ${c.key}`)));
  });
  assert.deepStrictEqual(recruitmentReport('vacancy-age', data).rows.map((r) => [r.vacancy_code, r.age_days]), [['VAC-2026-0001', 10], ['VAC-2026-0003', 3]]);
  const inter = recruitmentReport('interview-success', data).rows[0];
  assert.deepStrictEqual([inter.interviewed, inter.reached_offer, inter.rate], [3, 2, 66.7], 'two of three interviewed went on to an offer');
  assert.deepStrictEqual(recruitmentReport('offer-acceptance', data).rows.find((r) => r.vacancy_code === 'VAC-2026-0001'), { vacancy_code: 'VAC-2026-0001', title: 'Technician', accepted: 2, declined: 1, rate: 66.7 });
  assert.throws(() => recruitmentReport('nope', data), (e) => e.status === 404);
  // A linked job description names the vacancy, as on the careers page.
  const named = recruitmentReport('vacancy-age', { ...data, vacancies: [{ ...vacancies[0], job_description_id: 4 }], jobDescriptions: [{ id: 4, title: 'Water tank technician' }] });
  assert.strictEqual(named.rows[0].title, 'Water tank technician');
}

console.log('testHrReports: all passed');
