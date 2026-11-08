/**
 * HR reports (M1 §8, M2 §14) and the HR dashboard (M1 §12, M2 §15), plan Tasks 7 and 15. Recruitment widgets
 * join the dashboard in Task 22. Employee reports need emp.view_any; pay and identity columns follow the
 * viewer's access settings.
 */
const { asyncHandler } = require('../utils/controllerHelpers');
const M = require('../models/hrOrganisation');
const { Op } = require('sequelize');
const { HrChangeRequest } = require('../models/hrChange');
const User = require('../models/User');
const { orgReport, orgWidgets, toCsv, employeeReport, employeeWidgets, recruitmentReport, recruitmentWidgets } = require('../services/hrReports.service');
const { HrEmployee, HrEmployeeDocument, HrEmployeeType } = require('../models/hrEmployee');
const { HrHistory } = require('../models/hrChange');
const { PAYROLL_FIELDS, SENSITIVE_FIELDS } = require('../services/hrAccess.service');
const { orgAlerts } = require('../services/hrOrg.service');
const { can, ROLE_LABELS } = require('../services/hrAccess.service');
const { canAct, LABELS } = require('../services/hrApproval.service');

const loadOrg = async () => {
  const [companies, divisions, departments, teams, positions, costCentres] = await Promise.all([
    M.HrCompany.findAll({ raw: true }), M.HrDivision.findAll({ raw: true }), M.HrDepartment.findAll({ raw: true }),
    M.HrTeam.findAll({ raw: true }), M.HrPosition.findAll({ raw: true }), M.HrCostCentre.findAll({ raw: true }),
  ]);
  const employees = await HrEmployee.findAll({ where: { archived_at: null }, raw: true });
  return { companies, divisions, departments, teams, positions, costCentres, employees };
};

const loadPeople = async (org) => {
  const [documents, types] = await Promise.all([HrEmployeeDocument.findAll({ raw: true }), HrEmployeeType.findAll()]);
  return { ...org, documents, requiredByType: Object.fromEntries(types.map((t) => [t.name, t.required_documents || []])) };
};

const sendReport = (res, report, kind, format) => {
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${kind}-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(`\uFEFF${toCsv(report)}`);
  }
  return res.json(report);
};

exports.orgReport = asyncHandler(async (req, res) => {
  if (req.params.kind === 'cost-centres' && !can(req.hrRole, 'org.view_cost', req.hrSettings)) return res.status(403).json({ error: 'You do not have access to this' });
  let report;
  try { report = orgReport(req.params.kind, await loadOrg()); } catch (err) { return res.status(err.status || 500).json({ error: err.message }); }
  return sendReport(res, report, req.params.kind, req.query.format);
});

// GET /api/hr/reports/employees/:kind (M2 §14)
exports.employeeReport = asyncHandler(async (req, res) => {
  const may = (a) => can(req.hrRole, a, req.hrSettings);
  if (!may('emp.view_any')) return res.status(403).json({ error: 'You do not have access to this' });
  if (req.params.kind === 'salary-grades' && !may('emp.view_payroll') && !may('org.view_cost')) return res.status(403).json({ error: 'You do not have access to this' });
  const data = await loadPeople(await loadOrg());
  if (['transfers', 'employee-history'].includes(req.params.kind)) {
    const hidden = [...(may('emp.view_payroll') ? [] : [...PAYROLL_FIELDS, 'salary_grade_id']), ...(may('emp.view_sensitive') ? [] : SENSITIVE_FIELDS)];
    data.history = await HrHistory.findAll({ where: { entity_type: 'employee', ...(hidden.length ? { field: { [Op.notIn]: hidden } } : {}) }, order: [['id', 'DESC']], limit: 5000, raw: true });
  }
  if (req.params.kind === 'salary-grades') data.salaryGrades = await M.HrSalaryGrade.findAll({ raw: true });
  let report;
  try { report = employeeReport(req.params.kind, data); } catch (err) { return res.status(err.status || 500).json({ error: err.message }); }
  return sendReport(res, report, req.params.kind, req.query.format);
});

/** Everything the recruitment reports and widgets read (M3 §18–19). Candidate personal details stay out. */
const loadRecruitment = async () => {
  const R = require('../models/hrRecruitment');
  const [vacancies, applications, offers, events, interviews, candidates, departments, positions] = await Promise.all([
    R.HrVacancy.findAll({ raw: true }),
    R.HrApplication.findAll({ attributes: { exclude: ['cover_letter', 'screening'] }, raw: true }),
    R.HrOffer.findAll({ attributes: ['application_id', 'status', 'sent_at', 'accepted_at', 'declined_at'], raw: true }),
    R.HrApplicationEvent.findAll({ where: { kind: 'status' }, attributes: ['application_id', 'kind', 'to_status', 'at'], raw: true }),
    R.HrInterview.findAll({ attributes: ['application_id', 'status', 'scheduled_at'], raw: true }),
    R.HrCandidate.findAll({ attributes: ['id', 'candidate_code', 'full_name', 'years_experience', 'highest_qualification', 'location', 'availability', 'in_talent_pool'], raw: true }),
    M.HrDepartment.findAll({ raw: true }), M.HrPosition.findAll({ raw: true }),
  ]);
  const jobDescriptions = await R.HrJobDescription.findAll({ attributes: ['id', 'title'], raw: true });
  return { vacancies, applications, offers, events, interviews, candidates, departments, positions, jobDescriptions, now: new Date() };
};

// GET /api/hr/reports/recruitment/:kind (M3 §18), HR only.
exports.recruitmentReport = asyncHandler(async (req, res) => {
  if (!can(req.hrRole, 'rec.manage', req.hrSettings)) return res.status(403).json({ error: 'You do not have access to this' });
  let report;
  try { report = recruitmentReport(req.params.kind, await loadRecruitment()); } catch (err) { return res.status(err.status || 500).json({ error: err.message }); }
  return sendReport(res, report, req.params.kind, req.query.format);
});

exports.dashboard = asyncHandler(async (req, res) => {
  const data = await loadOrg();
  const alerts = orgAlerts(data);
  const named = (ids, rows, field = 'name') => ids.map((id) => ({ id, name: (rows.find((r) => Number(r.id) === Number(id)) || {})[field] }));
  const pending = (await HrChangeRequest.findAll({ where: { status: 'pending' } })).map((r) => r.get({ plain: true }));
  const changes = (await HrChangeRequest.findAll({ where: { kind: { [Op.like]: 'org.%' } }, order: [['id', 'DESC']], limit: 8 })).map((r) => r.get({ plain: true }));
  const users = await User.findAll({ where: { id: [...new Set(changes.flatMap((c) => [c.requested_by, ...c.chain.map((s) => s.decided_by)]).filter(Boolean))] }, attributes: ['id', 'name'], raw: true });
  const who = (id) => (users.find((u) => u.id === id) || {}).name || null;
  const entityName = (c) => {
    const rows = { department: data.departments, position: data.positions, salary_grade: [], division: data.divisions }[c.entity_type] || [];
    const row = rows.find((x) => Number(x.id) === Number(c.entity_id)) || {};
    return c.payload.name || c.payload.title || row.name || row.title || null;
  };
  const people = can(req.hrRole, 'emp.view_any', req.hrSettings) ? employeeWidgets(await loadPeople(data)) : null;
  const recruitment = can(req.hrRole, 'rec.manage', req.hrSettings) ? recruitmentWidgets(await loadRecruitment()) : null;
  res.json({
    organisation: orgWidgets(data),
    people,
    recruitment,
    headcountByDivision: orgReport('headcount-by-division', data).rows,
    inactiveDepartments: data.departments.filter((d) => d.is_active === false).map((d) => ({ id: d.id, name: d.name })),
    alerts: {
      departmentsWithoutManager: named(alerts.departmentsWithoutManager, data.departments),
      positionsWithoutSupervisor: named(alerts.positionsWithoutSupervisor, data.positions, 'title'),
      positionsWithoutJobDescription: named(alerts.positionsWithoutJobDescription, data.positions, 'title'),
    },
    approvals: {
      waitingForMe: pending.filter((r) => canAct(r, { id: req.user.id, hrRole: req.hrRole })).length,
      pending: pending.length,
      recent: pending.slice(0, 5).map((r) => ({ id: r.id, code: r.code, label: LABELS[r.kind] || r.kind, created_at: r.createdAt })),
    },
    recentChanges: changes.map((c) => {
      const last = [...c.chain].reverse().find((s) => s.decided_by);
      return {
        id: c.id, code: c.code, label: LABELS[c.kind] || c.kind, subject: entityName(c), status: c.status,
        requested_by_name: who(c.requested_by), waiting_for: c.status === 'pending' ? ROLE_LABELS[(c.chain[c.step] || {}).role] || null : null,
        decided_at: last ? last.at : null, decided_by_name: last ? who(last.decided_by) : null, created_at: c.createdAt,
      };
    }),
  });
});
