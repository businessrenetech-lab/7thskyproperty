/**
 * /api/hr/recruitment: Recruitment & ATS (plan Tasks 18 and 20; client spec Module 3).
 *
 * Who: HR (rec.manage) runs everything. Department managers (rec.request) raise workforce requests for the
 * departments they run and follow them and the vacancies that come out of them; they see no candidate files.
 * A workforce request goes through Department Manager → HR Manager → Finance → CEO (M3 §5) and is then
 * published as a vacancy. A candidate becomes an employee only through the M3 §21 transfer (rec.hire).
 */
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const { asyncHandler } = require('../utils/controllerHelpers');
const catalog = require('../config/hrCatalog');
const Org = require('../models/hrOrganisation');
const R = require('../models/hrRecruitment');
const { HrEmployee, HrEmployeeType } = require('../models/hrEmployee');
const { HrChangeRequest } = require('../models/hrChange');
const User = require('../models/User');
const { can } = require('../services/hrAccess.service');
const { raise } = require('../services/hrRequests');
const rules = require('../services/hrRecruitment.service');
const store = require('../services/hrRecruitmentStore');
const comms = require('../services/communication.service');

const bad = (res, status, error, extra = {}) => res.status(status).json({ error, ...extra });
const allowed = (req, a) => can(req.hrRole, a, req.hrSettings);
const isHr = (req) => allowed(req, 'rec.manage');
const { plain } = store;
const only = (body, keys) => Object.fromEntries(keys.filter((k) => body && body[k] !== undefined).map((k) => [k, body[k] === '' ? null : body[k]]));
const discard = (req) => { (req.files || (req.file ? [req.file] : [])).forEach((f) => require('fs').unlink(f.path, () => {})); };
const publicBase = (req) => process.env.CAREERS_BASE_URL || process.env.PUBLIC_ADMIN_URL || `${req.protocol}://${req.get('host')}/admin`;
const careersUrl = (req, v) => `${publicBase(req)}/careers/${v.public_slug}`;

/** Departments a department manager runs (directly, or through the division they head). */
async function managedDepartmentIds(req) {
  const emp = req.hrContext && req.hrContext.employee;
  if (!emp) return [];
  const [deps, divs] = await Promise.all([
    Org.HrDepartment.findAll({ where: { manager_employee_id: emp.id }, attributes: ['id'], raw: true }),
    Org.HrDivision.findAll({ where: { head_employee_id: emp.id }, attributes: ['id'], raw: true }),
  ]);
  const viaDiv = divs.length ? await Org.HrDepartment.findAll({ where: { division_id: divs.map((d) => d.id) }, attributes: ['id'], raw: true }) : [];
  return [...new Set([...deps, ...viaDiv].map((d) => d.id))];
}

async function names(rows) {
  const ids = (k) => [...new Set(rows.map((r) => r[k]).filter(Boolean))];
  const posIds = [...new Set([...ids('position_id'), ...ids('reports_to_position_id')])];
  const [deps, poss, users, branches] = await Promise.all([
    Org.HrDepartment.findAll({ where: { id: ids('department_id') }, attributes: ['id', 'name'], raw: true }),
    Org.HrPosition.findAll({ where: { id: posIds }, attributes: ['id', 'title'], raw: true }),
    User.findAll({ where: { id: [...ids('requested_by'), ...ids('created_by')] }, attributes: ['id', 'name'], raw: true }),
    require('../models/Branch').findAll({ where: { id: ids('location_branch_id') }, attributes: ['id', 'name'], raw: true }),
  ]);
  const m = (list, f) => Object.fromEntries(list.map((x) => [x.id, x[f]]));
  return { dep: m(deps, 'name'), pos: m(poss, 'title'), user: m(users, 'name'), branch: m(branches, 'name') };
}

/** The org records a form refers to must exist, or the save is a 400 rather than a foreign-key 500. */
async function badRefs(data) {
  const checks = [['department_id', Org.HrDepartment, 'department'], ['position_id', Org.HrPosition, 'position'], ['reports_to_position_id', Org.HrPosition, 'reports-to position'],
    ['salary_grade_id', Org.HrSalaryGrade, 'salary grade'], ['location_branch_id', require('../models/Branch'), 'location'], ['work_location_branch_id', require('../models/Branch'), 'work location'],
    ['supervisor_employee_id', HrEmployee, 'supervisor'], ['job_description_id', R.HrJobDescription, 'job description']];
  for (const [k, Model, label] of checks) if (data[k] != null && !(await Model.findByPk(data[k], { attributes: ['id'] }))) return `That ${label} does not exist`;
  return null;
}

/* ── Meta ─────────────────────────────────────────────────────────────────── */

exports.meta = asyncHandler(async (req, res) => {
  const hr = isHr(req);
  const [types, branches, departments, positions, supervisors] = await Promise.all([
    HrEmployeeType.findAll({ where: { is_active: true }, attributes: ['name'], order: [['name', 'ASC']], raw: true }),
    require('../models/Branch').findAll({ attributes: ['id', 'name'], order: [['name', 'ASC']], raw: true }),
    Org.HrDepartment.findAll({ where: { is_active: true }, attributes: ['id', 'name'], order: [['name', 'ASC']], raw: true }),
    Org.HrPosition.findAll({ where: { is_active: true }, attributes: ['id', 'title', 'code', 'department_id', 'reports_to_position_id', 'is_top', 'employment_type'], order: [['title', 'ASC']], raw: true }),
    hr ? HrEmployee.findAll({ where: { archived_at: null, status: catalog.SEAT_HOLDING_STATUSES }, attributes: ['id', 'full_name', 'employee_code', 'position_id'], order: [['full_name', 'ASC']], limit: 1000, raw: true }) : [],
  ]);
  // A department manager picks only from the departments they run.
  const mine = hr ? null : await managedDepartmentIds(req);
  res.json({
    branches, supervisors,
    departments: mine ? departments.filter((d) => mine.includes(d.id)) : departments,
    positions: mine ? positions.filter((p) => mine.includes(p.department_id)) : positions,
    statuses: catalog.APPLICANT_STATUSES, next: Object.fromEntries(catalog.APPLICANT_STATUSES.map((s) => [s, rules.allowedNext(s)])),
    priorities: catalog.PRIORITIES, interviewTypes: catalog.INTERVIEW_TYPES, competencies: catalog.COMPETENCIES, recommendations: catalog.RECOMMENDATIONS,
    checkTypes: catalog.CHECK_TYPES, optionalChecks: store.OPTIONAL_CHECKS, channels: catalog.CHANNELS, requestKinds: ['New Position', 'Replacement'],
    weights: rules.DEFAULT_WEIGHTS, criteria: rules.CRITERIA_LABELS, employeeTypes: types.map((t) => t.name),
    documentTypes: ['CV', 'Photo', 'National ID', 'Educational Certificates', 'Professional Certificates', 'Cover Letter', 'Portfolio', 'Licence Copies'],
    canManage: hr,
  });
});

/* ── Job description library (M3 §6) ─────────────────────────────────────── */

exports.listJds = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.position_id) where.position_id = req.query.position_id;
  if (req.query.department_id) where.department_id = req.query.department_id;
  if (req.query.active !== 'all') where.is_active = true;
  if (req.query.q) where.title = { [Op.like]: `%${req.query.q}%` };
  const rows = (await R.HrJobDescription.findAll({ where, order: [['title', 'ASC']] })).map(plain);
  const n = await names(rows);
  res.json({ data: rows.map((r) => ({ ...r, department_name: n.dep[r.department_id] || null, position_title: n.pos[r.position_id] || null, reports_to_title: n.pos[r.reports_to_position_id] || null })) });
});

exports.getJd = asyncHandler(async (req, res) => {
  const jd = await R.HrJobDescription.findByPk(req.params.id);
  return jd ? res.json(plain(jd)) : bad(res, 404, 'Job description not found');
});

exports.createJd = asyncHandler(async (req, res) => {
  const data = only(req.body, R.FIELDS.jobDescription);
  if (!String(data.title || '').trim()) return bad(res, 400, 'Give the job description a title');
  const refErr = await badRefs(data);
  if (refErr) return bad(res, 400, refErr);
  const jd = await R.HrJobDescription.create({ ...data, branch_id: req.user.branch_id || null, created_by: req.user.id });
  res.status(201).json(plain(jd));
});

exports.updateJd = asyncHandler(async (req, res) => {
  const jd = await R.HrJobDescription.findByPk(req.params.id);
  if (!jd) return bad(res, 404, 'Job description not found');
  const data = only(req.body, R.FIELDS.jobDescription);
  if ('title' in data && !String(data.title || '').trim()) return bad(res, 400, 'Give the job description a title');
  const refErr = await badRefs(data);
  if (refErr) return bad(res, 400, refErr);
  await jd.update(data);
  res.json(plain(jd));
});

exports.cloneJd = asyncHandler(async (req, res) => {
  const jd = await R.HrJobDescription.findByPk(req.params.id);
  if (!jd) return bad(res, 404, 'Job description not found');
  const src = plain(jd);
  const copy = await R.HrJobDescription.create({
    ...only(src, R.FIELDS.jobDescription), ...only(req.body, R.FIELDS.jobDescription),
    title: String((req.body && req.body.title) || `${src.title} (copy)`), cloned_from_id: src.id, branch_id: req.user.branch_id || null, created_by: req.user.id, is_active: true,
  });
  res.status(201).json(plain(copy));
});

/* ── Workforce requests → vacancy approval (M3 §3–5) ──────────────────────── */

const WR_STATUS = { approved: 'approved', rejected: 'rejected', withdrawn: 'withdrawn' };

exports.listRequests = asyncHandler(async (req, res) => {
  const where = {};
  if (!isHr(req)) where[Op.or] = [{ requested_by: req.user.id }, { department_id: await managedDepartmentIds(req) }];
  const rows = (await R.HrWorkforceRequest.findAll({ where, order: [['id', 'DESC']] })).map(plain);
  const crs = await HrChangeRequest.findAll({ where: { id: rows.map((r) => r.change_request_id).filter(Boolean) }, attributes: ['id', 'code', 'status', 'step', 'chain'] });
  const byId = Object.fromEntries(crs.map((c) => [c.id, plain(c)]));
  const vacs = await R.HrVacancy.findAll({ where: { workforce_request_id: rows.map((r) => r.id) }, attributes: ['id', 'workforce_request_id', 'vacancy_code', 'status'], raw: true });
  const n = await names(rows);
  const deciders = await User.findAll({ where: { id: [...new Set(crs.flatMap((c) => (c.chain || []).map((s) => s.decided_by)).filter(Boolean))] }, attributes: ['id', 'name'], raw: true });
  const decider = Object.fromEntries(deciders.map((u) => [u.id, u.name]));
  res.json({
    data: rows.map((r) => {
      const cr = byId[r.change_request_id];
      if (cr) cr.chain = (cr.chain || []).map((s) => ({ ...s, decided_by_name: s.decided_by ? decider[s.decided_by] || null : null }));
      return {
        ...r, status: cr && WR_STATUS[cr.status] ? WR_STATUS[cr.status] : r.status,
        department_name: n.dep[r.department_id] || null, position_title: n.pos[r.position_id] || null, requested_by_name: n.user[r.requested_by] || null,
        change_request: cr ? { id: cr.id, code: cr.code, status: cr.status, chain: cr.chain, step: cr.step } : null,
        vacancy: vacs.find((v) => v.workforce_request_id === r.id) || null,
      };
    }),
  });
});

exports.createRequest = asyncHandler(async (req, res) => {
  const data = only(req.body, R.FIELDS.workforceRequest);
  const missing = [['department_id', 'department'], ['position_id', 'position'], ['reason', 'reason for recruitment'], ['request_kind', 'new position or replacement'],
    ['employment_type', 'employment type'], ['expected_joining_date', 'expected joining date'], ['closing_date', 'closing date']].filter(([k]) => !data[k]).map(([, l]) => l);
  if (missing.length) return bad(res, 400, `Required: ${missing.join(', ')}`);
  if (!['New Position', 'Replacement'].includes(data.request_kind)) return bad(res, 400, 'Choose New Position or Replacement');
  if (data.priority && !catalog.PRIORITIES.includes(data.priority)) return bad(res, 400, 'Choose a priority from the list');
  const count = Number(data.vacancies_count || 1);
  if (!Number.isInteger(count) || count < 1 || count > 100) return bad(res, 400, 'The number of vacancies must be between 1 and 100');
  if (data.salary_min != null && data.salary_max != null && Number(data.salary_min) > Number(data.salary_max)) return bad(res, 400, 'The lowest salary is above the highest');
  const pos = await Org.HrPosition.findByPk(data.position_id);
  if (!pos || !pos.is_active || Number(pos.department_id) !== Number(data.department_id)) return bad(res, 400, 'Choose an active position in that department');
  if (!isHr(req) && !(await managedDepartmentIds(req)).includes(Number(data.department_id))) return bad(res, 403, 'You can request staff only for a department you manage');
  const refErr = await badRefs(data);
  if (refErr) return bad(res, 400, refErr);

  const wr = await R.HrWorkforceRequest.create({ ...data, vacancies_count: count, budget_available: Boolean(data.budget_available), priority: data.priority || 'Normal', branch_id: req.user.branch_id || null, requested_by: req.user.id, status: 'pending' });
  const cr = await raise(req, { kind: 'rec.vacancy', entity_type: 'workforce_request', entity_id: wr.id, payload: { workforce_request_id: wr.id, position: pos.title, vacancies: count }, reason: data.reason });
  // M3 §5 starts with the Department Manager: a manager's own submission is that step (they cannot approve
  // their own request later, so the chain would never move otherwise).
  if (req.hrRole === 'department_manager') {
    const chain = cr.chain.map((s) => ({ ...s }));
    chain[0] = { ...chain[0], decided_by: req.user.id, decision: 'approve', comment: 'Submitted by the department manager', at: new Date().toISOString() };
    await cr.update({ chain, step: 1 });
  }
  await wr.update({ change_request_id: cr.id });
  const next = cr.chain[cr.step];
  const to = (await store.usersWithHrRole([next.role])).filter((id) => id !== req.user.id);
  await store.notify(to, req.user.branch_id, 'Vacancy request needs your approval', `${cr.code}: ${count} × ${pos.title} is waiting for you.`);
  res.status(202).json({ message: 'Sent for approval', workforce_request: plain(wr), change_request: { id: cr.id, code: cr.code } });
});

/* ── Vacancies (M3 §4, §7) ────────────────────────────────────────────────── */

async function decorateVacancies(rows) {
  const n = await names(rows);
  const counts = rows.length ? await R.HrApplication.findAll({ where: { vacancy_id: rows.map((r) => r.id) }, attributes: ['vacancy_id', 'status', [sequelize.fn('COUNT', sequelize.col('id')), 'n']], group: ['vacancy_id', 'status'], raw: true }) : [];
  const jds = await R.HrJobDescription.findAll({ where: { id: rows.map((r) => r.job_description_id).filter(Boolean) }, attributes: ['id', 'title'], raw: true });
  return rows.map((r) => {
    const mine = counts.filter((c) => c.vacancy_id === r.id);
    const by = Object.fromEntries(mine.map((c) => [c.status, Number(c.n)]));
    return {
      ...r, title: (jds.find((j) => j.id === r.job_description_id) || {}).title || n.pos[r.position_id] || r.vacancy_code,
      department_name: n.dep[r.department_id] || null, position_title: n.pos[r.position_id] || null, reports_to_title: n.pos[r.reports_to_position_id] || null,
      location_name: n.branch[r.location_branch_id] || null, applications: mine.reduce((a, c) => a + Number(c.n), 0), by_status: by,
    };
  });
}

async function vacancyScope(req) {
  if (isHr(req)) return {};
  return { department_id: await managedDepartmentIds(req) };
}

exports.listVacancies = asyncHandler(async (req, res) => {
  const where = { ...(await vacancyScope(req)) };
  ['status', 'department_id', 'priority'].forEach((k) => { if (req.query[k]) where[k] = String(req.query[k]).split(','); });
  if (req.query.q) where.vacancy_code = { [Op.like]: `%${req.query.q}%` };
  const rows = (await R.HrVacancy.findAll({ where, order: [['id', 'DESC']] })).map(plain);
  res.json({ data: await decorateVacancies(rows) });
});

const loadVacancy = async (req, res) => {
  const v = await R.HrVacancy.findOne({ where: { vacancy_code: req.params.code, ...(await vacancyScope(req)) } });
  if (!v) { bad(res, 404, 'Vacancy not found'); return null; }
  return v;
};

exports.getVacancy = asyncHandler(async (req, res) => {
  const v = await loadVacancy(req, res);
  if (!v) return undefined;
  const [row] = await decorateVacancies([plain(v)]);
  const jd = v.job_description_id ? plain(await R.HrJobDescription.findByPk(v.job_description_id)) : null;
  const out = { ...row, job_description: jd, careers_url: careersUrl(req, v) };
  if (isHr(req)) {
    const apps = (await R.HrApplication.findAll({ where: { vacancy_id: v.id }, order: [['applied_at', 'DESC']] })).map(plain);
    const cands = await R.HrCandidate.findAll({ where: { id: apps.map((a) => a.candidate_id) }, attributes: ['id', 'candidate_code', 'full_name', 'email', 'mobile', 'years_experience', 'duplicate_of_id'], raw: true });
    const ids = apps.map((a) => a.id);
    const [ivs, chks, offers] = ids.length ? await Promise.all([
      R.HrInterview.findAll({ where: { application_id: ids, status: 'scheduled' }, order: [['scheduled_at', 'ASC']], attributes: ['application_id', 'type', 'scheduled_at', 'meeting_link'], raw: true }),
      R.HrCheck.findAll({ where: { application_id: ids }, attributes: ['application_id', 'check_type', 'required', 'status'], raw: true }),
      R.HrOffer.findAll({ where: { application_id: ids }, order: [['id', 'DESC']], attributes: ['application_id', 'status', 'sent_at'], raw: true }),
    ]) : [[], [], []];
    out.applications_list = apps.map((a) => {
      const mine = chks.filter((c) => c.application_id === a.id);
      return {
        ...a, screening: undefined, candidate: cands.find((c) => c.id === a.candidate_id) || null,
        next_interview: ivs.find((i) => i.application_id === a.id) || null,
        checks_left: mine.length ? rules.checksComplete(mine).missing.length : null,
        offer: offers.find((o) => o.application_id === a.id) || null,
      };
    });
  }
  res.json(out);
});

exports.updateVacancy = asyncHandler(async (req, res) => {
  const v = await loadVacancy(req, res);
  if (!v) return undefined;
  const data = only(req.body, R.FIELDS.vacancy);
  if (data.priority && !catalog.PRIORITIES.includes(data.priority)) return bad(res, 400, 'Choose a priority from the list');
  if (data.positions_count != null && (!Number.isInteger(Number(data.positions_count)) || Number(data.positions_count) < 1)) return bad(res, 400, 'The number of positions must be at least 1');
  if (data.cost_amount != null && Number(data.cost_amount) < 0) return bad(res, 400, 'The recruitment cost cannot be negative');
  const refErr = await badRefs(data);
  if (refErr) return bad(res, 400, refErr);
  await v.update(data);
  const [row] = await decorateVacancies([plain(v)]);
  res.json(row);
});

const SHARE = {
  LinkedIn: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`,
  Facebook: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
  Bdjobs: () => 'https://corporate3.bdjobs.com/',
};

exports.publishVacancy = asyncHandler(async (req, res) => {
  const v = await loadVacancy(req, res);
  if (!v) return undefined;
  if (!['published'].includes(v.status)) return bad(res, 409, v.status === 'pending_approval' || v.status === 'draft' ? 'The vacancy is not approved yet' : 'This vacancy is closed');
  const channels = Array.isArray(req.body && req.body.channels) ? req.body.channels.filter((c) => catalog.CHANNELS.includes(c)) : [];
  if (!channels.length) return bad(res, 400, 'Choose at least one channel');
  const [row] = await decorateVacancies([plain(v)]);
  const url = careersUrl(req, v);
  const text = rules.shareText({ ...row, title: row.title }, url);
  const results = [];
  for (const ch of channels) {
    if (['Seventh Sky Website', 'Careers Portal', 'Internal Vacancy Board'].includes(ch)) results.push({ channel: ch, status: 'live', url });
    else if (SHARE[ch]) results.push({ channel: ch, status: 'ready_to_post', text, share_url: SHARE[ch](url) });
    else if (ch === 'Email Campaigns') {
      // M3 §16: the talent pool hears about new vacancies first.
      const pool = await R.HrCandidate.findAll({ where: { in_talent_pool: true, email: { [Op.ne]: null } }, attributes: ['email', 'full_name'], limit: 500, raw: true });
      let sent = 0;
      for (const c of pool) {
        const r = await comms.sendEmail(c.email, `New vacancy at Seventh Sky: ${row.title}`, `<p>Dear ${c.full_name},</p><p>${text.replace(/\n/g, '<br>')}</p><p>You are receiving this because you are in our talent pool.</p>`, [], 'hr');
        if (r && r.success) sent += 1;
      }
      results.push({ channel: ch, status: 'sent', sent, of: pool.length });
    }
  }
  await v.update({ channels: [...new Set([...(v.channels || []), ...channels])] });
  res.json({ vacancy_code: v.vacancy_code, results });
});

/** Talent pool "Invite to apply" (M3 §16): the vacancy's careers link, emailed to the chosen candidates. */
exports.inviteToVacancy = asyncHandler(async (req, res) => {
  const v = await loadVacancy(req, res);
  if (!v) return undefined;
  if (!rules.isOpenForApplications(plain(v))) return bad(res, 409, 'This vacancy is not open for applications');
  const codes = Array.isArray(req.body && req.body.candidate_codes) ? [...new Set(req.body.candidate_codes.map(String))].slice(0, 200) : [];
  if (!codes.length) return bad(res, 400, 'Choose at least one person');
  const cands = await R.HrCandidate.findAll({ where: { candidate_code: codes }, attributes: ['id', 'full_name', 'email'], raw: true });
  const [row] = await decorateVacancies([plain(v)]);
  const url = careersUrl(req, v);
  const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  let sent = 0;
  for (const c of cands.filter((x) => x.email)) {
    const r = await comms.sendEmail(c.email, `You're invited to apply: ${row.title} at Seventh Sky`,
      `<p>Dear ${esc(c.full_name)},</p><p>We think you would be a good fit for <b>${esc(row.title)}</b> (${esc(v.vacancy_code)}). You can read about the role and apply here:</p><p><a href="${esc(url)}">${esc(url)}</a></p><p>Human Resources, Seventh Sky Private Ltd</p>`, [], 'hr');
    if (r && r.success !== false) sent += 1;
  }
  res.json({ sent, of: cands.length, without_email: cands.filter((x) => !x.email).length });
});

exports.closeVacancy = asyncHandler(async (req, res) => {
  const v = await loadVacancy(req, res);
  if (!v) return undefined;
  if (['closed', 'filled'].includes(v.status)) return bad(res, 409, 'This vacancy is already closed');
  const closed = await sequelize.transaction(async (transaction) => {
    await v.update({ status: 'closed', closed_at: new Date() }, { transaction });
    return store.closeOpenApplications(v.id, req, transaction, (req.body && req.body.reason) || 'The vacancy was closed');
  });
  res.json({ message: `Closed. ${closed} open ${closed === 1 ? 'application was' : 'applications were'} marked Not Selected.`, vacancy_code: v.vacancy_code });
});

/* ── Candidates and talent pool (M3 §8, §9, §16) ──────────────────────────── */

exports.listCandidates = asyncHandler(async (req, res) => {
  const q = req.query;
  const where = {};
  if (q.talent_pool === '1') where.in_talent_pool = true;
  if (q.archived !== 'all') where.archived_at = q.archived === '1' ? { [Op.ne]: null } : null;
  if (q.archived === 'any') delete where.archived_at;
  if (q.q) where[Op.or] = [{ full_name: { [Op.like]: `%${q.q}%` } }, { candidate_code: { [Op.like]: `%${q.q}%` } }, { email: { [Op.like]: `%${q.q}%` } }];
  if (q.location) where.location = { [Op.like]: `%${q.location}%` };
  if (q.availability) where.availability = { [Op.like]: `%${q.availability}%` };
  if (q.education) where.highest_qualification = { [Op.like]: `%${q.education}%` };
  if (q.min_experience) where.years_experience = { [Op.gte]: Number(q.min_experience) };
  let rows = (await R.HrCandidate.findAll({ where, order: [['id', 'DESC']], limit: 500 })).map(plain);
  if (q.skill) { const s = String(q.skill).toLowerCase(); rows = rows.filter((c) => (c.skills || []).some((k) => String(k).toLowerCase().includes(s))); }
  const apps = rows.length ? await R.HrApplication.findAll({ where: { candidate_id: rows.map((c) => c.id) }, attributes: ['id', 'candidate_id', 'vacancy_id', 'status', 'applied_at', 'screening_score'], raw: true }) : [];
  const vacs = await decorateVacancies((await R.HrVacancy.findAll({ where: { id: [...new Set(apps.map((a) => a.vacancy_id))] } })).map(plain));
  if (q.position_id) { const keep = new Set(apps.filter((a) => vacs.find((v) => v.id === a.vacancy_id && Number(v.position_id) === Number(q.position_id))).map((a) => a.candidate_id)); rows = rows.filter((c) => keep.has(c.id)); }
  res.json({
    data: rows.map((c) => ({
      ...c, applications: apps.filter((a) => a.candidate_id === c.id).map((a) => {
        const v = vacs.find((x) => x.id === a.vacancy_id) || {};
        return { ...a, vacancy_code: v.vacancy_code, title: v.title };
      }),
    })),
  });
});

const loadCandidate = async (req, res) => {
  const c = await R.HrCandidate.findOne({ where: { candidate_code: req.params.code } });
  if (!c) { bad(res, 404, 'Candidate not found'); return null; }
  return c;
};

exports.getCandidate = asyncHandler(async (req, res) => {
  const c = await loadCandidate(req, res);
  if (!c) return undefined;
  const apps = (await R.HrApplication.findAll({ where: { candidate_id: c.id }, order: [['applied_at', 'DESC']] })).map(plain);
  const ids = apps.map((a) => a.id);
  const [vacs, events, interviews, checks, offers, docs, original] = await Promise.all([
    R.HrVacancy.findAll({ where: { id: apps.map((a) => a.vacancy_id) } }).then((r) => decorateVacancies(r.map(plain))),
    R.HrApplicationEvent.findAll({ where: { application_id: ids }, order: [['at', 'ASC'], ['id', 'ASC']] }).then((r) => r.map(plain)),
    R.HrInterview.findAll({ where: { application_id: ids }, order: [['scheduled_at', 'ASC']] }).then((r) => r.map(plain)),
    R.HrCheck.findAll({ where: { application_id: ids }, order: [['id', 'ASC']] }).then((r) => r.map(plain)),
    R.HrOffer.findAll({ where: { application_id: ids }, order: [['id', 'DESC']] }).then((r) => r.map(plain)),
    R.HrCandidateDocument.findAll({ where: { candidate_id: c.id }, order: [['id', 'DESC']] }).then((r) => r.map(plain)),
    c.duplicate_of_id ? R.HrCandidate.findByPk(c.duplicate_of_id, { attributes: ['candidate_code', 'full_name'], raw: true }) : null,
  ]);
  const evals = interviews.length ? (await R.HrEvaluation.findAll({ where: { interview_id: interviews.map((i) => i.id) } })).map(plain) : [];
  const userIds = [...new Set([...events.map((e) => e.actor_id), ...evals.map((e) => e.evaluator_id), ...checks.map((x) => x.verified_by), ...interviews.flatMap((i) => i.panel || [])].filter(Boolean))];
  const users = await User.findAll({ where: { id: userIds }, attributes: ['id', 'name'], raw: true });
  const uname = (id) => (users.find((u) => u.id === id) || {}).name || null;
  const hired = apps.filter((a) => a.hired_employee_id).map((a) => a.hired_employee_id);
  const emps = hired.length ? await HrEmployee.findAll({ where: { id: hired }, attributes: ['id', 'employee_code'], raw: true }) : [];
  res.json({
    ...plain(c), duplicate_of: original,
    documents: docs.map((d) => ({ ...d, uploaded_by_name: null })),
    applications: await Promise.all(apps.map(async (a) => {
      const offer = offers.find((o) => o.application_id === a.id) || null;
      const appChecks = checks.filter((x) => x.application_id === a.id).map((x) => ({ ...x, verified_by_name: uname(x.verified_by) }));
      const state = a.status === 'Offer Accepted' ? (await store.transferState(a.id)).verdict : null;
      return {
        ...a, vacancy: vacs.find((v) => v.id === a.vacancy_id) || null, next: rules.allowedNext(a.status),
        events: events.filter((e) => e.application_id === a.id).map((e) => ({ ...e, actor_name: uname(e.actor_id) })),
        interviews: interviews.filter((i) => i.application_id === a.id).map((i) => ({
          ...i, panel_names: (i.panel || []).map(uname).filter(Boolean),
          evaluations: evals.filter((e) => e.interview_id === i.id).map((e) => ({ ...e, evaluator_name: uname(e.evaluator_id) })),
        })),
        checks: appChecks, checks_complete: rules.checksComplete(appChecks),
        offer: offer ? { ...offer, token_hash: undefined } : null,
        transfer: state, hired_employee_code: (emps.find((e) => e.id === a.hired_employee_id) || {}).employee_code || null,
      };
    })),
  });
});

async function createOrLinkCandidate(input, { branchId, transaction }) {
  const all = await R.HrCandidate.findAll({ attributes: ['id', 'email', 'mobile', 'national_id', 'duplicate_of_id'], raw: true, transaction });
  const dup = rules.findDuplicate(input, all);
  return { dup, data: { ...input, email: input.email ? String(input.email).trim().toLowerCase() : null, mobile: rules.normalizeMobile(input.mobile) || input.mobile || null, branch_id: branchId } };
}
exports.createOrLinkCandidate = createOrLinkCandidate;

/** HR adds a candidate (e.g. a CV received by hand), optionally applying them to a vacancy. */
exports.createCandidate = asyncHandler(async (req, res) => {
  const input = only(req.body, R.FIELDS.candidate);
  if (!String(input.full_name || '').trim()) return bad(res, 400, 'Enter the full name');
  if (!input.email && !input.mobile) return bad(res, 400, 'Enter an email address or a mobile number');
  if (input.mobile && !rules.normalizeMobile(input.mobile)) return bad(res, 400, 'Enter a valid Bangladeshi mobile number');
  const vacancy = req.body.vacancy_code ? await R.HrVacancy.findOne({ where: { vacancy_code: req.body.vacancy_code } }) : null;
  if (req.body.vacancy_code && (!vacancy || vacancy.status !== 'published')) return bad(res, 400, 'That vacancy is not open');
  const out = await sequelize.transaction(async (transaction) => {
    const { dup, data } = await createOrLinkCandidate(input, { branchId: req.user.branch_id || null, transaction });
    const cand = await R.HrCandidate.create({ ...data, candidate_code: await store.nextCode(R.HrCandidate, 'candidate_code', 'CAN-', transaction), duplicate_of_id: dup ? dup.id : null }, { transaction });
    let app = null;
    if (vacancy) {
      app = await R.HrApplication.create({ candidate_id: cand.id, vacancy_id: vacancy.id, status: 'Application Received', source: req.body.source || 'Added by HR', applied_at: new Date() }, { transaction });
      await R.HrApplicationEvent.create({ application_id: app.id, kind: 'status', to_status: 'Application Received', actor_id: req.user.id, at: new Date(), note: req.body.source ? `Source: ${req.body.source}` : 'Added by HR' }, { transaction });
    }
    return { cand, app, dup };
  });
  res.status(201).json({ ...plain(out.cand), application: plain(out.app), duplicate_of: out.dup ? out.dup.id : null });
});

exports.updateCandidate = asyncHandler(async (req, res) => {
  const c = await loadCandidate(req, res);
  if (!c) return undefined;
  const data = only(req.body, R.FIELDS.candidate);
  if ('full_name' in data && !String(data.full_name || '').trim()) return bad(res, 400, 'Enter the full name');
  if (data.mobile) { const m = rules.normalizeMobile(data.mobile); if (!m) return bad(res, 400, 'Enter a valid Bangladeshi mobile number'); data.mobile = m; }
  if (data.email) data.email = String(data.email).trim().toLowerCase();
  if ('skills' in data && !Array.isArray(data.skills)) data.skills = String(data.skills || '').split(',').map((s) => s.trim()).filter(Boolean);
  await c.update(data);
  res.json(plain(c));
});

exports.addCandidateDocument = asyncHandler(async (req, res) => {
  const c = await R.HrCandidate.findOne({ where: { candidate_code: req.params.code } });
  if (!c) { discard(req); return bad(res, 404, 'Candidate not found'); }
  if (!req.file) return bad(res, 400, 'Choose a file to upload');
  const docType = String((req.body && req.body.doc_type) || '');
  if (!docType || docType.length > 60) { discard(req); return bad(res, 400, 'Choose a document type'); }
  const doc = await R.HrCandidateDocument.create({ candidate_id: c.id, doc_type: docType, file_url: `/uploads/documents/${req.file.filename}`, file_name: req.file.originalname, uploaded_by: req.user.id });
  res.status(201).json(plain(doc));
});

exports.setTalentPool = asyncHandler(async (req, res) => {
  const c = await loadCandidate(req, res);
  if (!c) return undefined;
  const on = Boolean(req.body && req.body.in);
  await c.update({ in_talent_pool: on, ...(on ? { archived_at: null } : {}) });
  res.json(plain(c));
});

/* ── Applications: status, screening, messages (M3 §10, §11; Hadi's applicant replies) ── */

const loadApp = async (req, res, opts = {}) => {
  const a = await R.HrApplication.findByPk(req.params.id, opts);
  if (!a) { bad(res, 404, 'Application not found'); return null; }
  return a;
};

exports.addApplication = asyncHandler(async (req, res) => {
  const cand = await R.HrCandidate.findOne({ where: { candidate_code: req.body && req.body.candidate_code } });
  const vac = await R.HrVacancy.findOne({ where: { vacancy_code: req.body && req.body.vacancy_code } });
  if (!cand || !vac) return bad(res, 400, 'Choose a candidate and an open vacancy');
  if (vac.status !== 'published') return bad(res, 400, 'That vacancy is not open');
  if (await R.HrApplication.findOne({ where: { candidate_id: cand.id, vacancy_id: vac.id } })) return bad(res, 409, 'This candidate has already applied for that vacancy');
  const app = await sequelize.transaction(async (transaction) => {
    const a = await R.HrApplication.create({ candidate_id: cand.id, vacancy_id: vac.id, status: 'Application Received', source: (req.body && req.body.source) || 'Talent Pool', applied_at: new Date() }, { transaction });
    await R.HrApplicationEvent.create({ application_id: a.id, kind: 'status', to_status: 'Application Received', actor_id: req.user.id, at: new Date(), note: `Added by HR (${a.source})` }, { transaction });
    await cand.update({ archived_at: null }, { transaction });
    return a;
  });
  res.status(201).json(plain(app));
});

exports.moveStatus = asyncHandler(async (req, res) => {
  const { to, note } = req.body || {};
  let result;
  try { result = await moveTx(req, to, note); } catch (e) {
    if (e.status) return bad(res, e.status, e.message, e.missing ? { missing: e.missing } : {});
    throw e;
  }
  res.json(plain(result));
});

const moveTx = (req, to, note) => sequelize.transaction(async (transaction) => {
    const app = await R.HrApplication.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!app) throw store.fail(404, 'Application not found');
    if (!rules.allowedNext(app.status).includes(to)) throw store.fail(409, `An application that is ${app.status} cannot move to ${to}`);
    if (to === 'Offer Pending') {
      const checks = (await R.HrCheck.findAll({ where: { application_id: app.id }, transaction })).map(plain);
      const c = rules.checksComplete(checks);
      if (!c.ok) throw store.fail(409, c.missing.length ? `Finish the required checks first: ${c.missing.join(', ')}` : 'Record the pre-employment checks first', { missing: c.missing });
    }
    await store.moveStatus(app, to, { actorId: req.user.id, note: note || null, transaction });
    if (to === 'Reference Check') await store.ensureChecks(app.id, transaction);
    const cand = await R.HrCandidate.findByPk(app.candidate_id, { transaction });
    if (to === 'Talent Pool') await cand.update({ in_talent_pool: true, archived_at: null }, { transaction });
    // M3 §16: on Not Selected HR says whether the candidate stays in the talent pool.
    if (to === 'Not Selected' && req.body && req.body.talent_pool === true) await cand.update({ in_talent_pool: true }, { transaction });
    return app;
});

exports.saveScreening = asyncHandler(async (req, res) => {
  const app = await loadApp(req, res);
  if (!app) return undefined;
  const scores = (req.body && req.body.scores) || {};
  const weights = (req.body && req.body.weights) || rules.DEFAULT_WEIGHTS;
  let score;
  try { score = rules.screeningScore(scores, weights); } catch (e) { return bad(res, 400, e.message); }
  await app.update({ screening: { scores, weights, by: req.user.id, at: new Date().toISOString() }, screening_score: score });
  await R.HrApplicationEvent.create({ application_id: app.id, kind: 'note', actor_id: req.user.id, at: new Date(), note: `CV screening score ${score}` });
  res.json(plain(app));
});

exports.addNote = asyncHandler(async (req, res) => {
  const app = await loadApp(req, res);
  if (!app) return undefined;
  const note = String((req.body && req.body.note) || '').trim();
  if (!note) return bad(res, 400, 'Write a note');
  const ev = await R.HrApplicationEvent.create({ application_id: app.id, kind: 'note', actor_id: req.user.id, at: new Date(), note: note.slice(0, 5000) });
  res.status(201).json(plain(ev));
});

/** Hadi's applicant replies: an email or SMS to the candidate, logged on the application. */
exports.message = asyncHandler(async (req, res) => {
  const app = await loadApp(req, res);
  if (!app) return undefined;
  const { channel, subject, body } = req.body || {};
  const text = String(body || '').trim();
  if (!text) return bad(res, 400, 'Write the message');
  const cand = await R.HrCandidate.findByPk(app.candidate_id);
  let r;
  if (channel === 'sms') {
    if (!cand.mobile) return bad(res, 400, 'This candidate has no mobile number');
    r = await comms.sendSMS(cand.mobile, text.slice(0, 600));
  } else if (channel === 'email') {
    if (!cand.email) return bad(res, 400, 'This candidate has no email address');
    const esc = (s) => String(s).replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
    r = await comms.sendEmail(cand.email, String(subject || 'Your application to Seventh Sky').slice(0, 200), `<p>${esc(text).replace(/\n/g, '<br>')}</p>`, [], 'hr');
  } else return bad(res, 400, 'Choose email or SMS');
  const ok = Boolean(r && r.success !== false);
  const ev = await R.HrApplicationEvent.create({ application_id: app.id, kind: 'message', channel, actor_id: req.user.id, at: new Date(), note: `${ok ? '' : '(not delivered) '}${channel === 'email' && subject ? `${subject}: ` : ''}${text}`.slice(0, 5000) });
  if (!ok) return bad(res, 502, 'The message could not be sent. It is logged on the application as not delivered.', { event: plain(ev) });
  res.status(201).json(plain(ev));
});

/* ── Interviews and evaluations (M3 §12, §13) ─────────────────────────────── */

async function sendInvites(interview, app, { reminder = false } = {}) {
  const cand = await R.HrCandidate.findByPk(app.candidate_id);
  const vac = await R.HrVacancy.findByPk(app.vacancy_id);
  const [v] = await decorateVacancies([plain(vac)]);
  const panel = await User.findAll({ where: { id: interview.panel || [] }, attributes: ['email', 'name'], raw: true });
  const when = new Date(interview.scheduled_at).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'full', timeStyle: 'short' });
  const where = interview.meeting_link ? `Online: <a href="${interview.meeting_link}">${interview.meeting_link}</a>` : (interview.location || 'To be confirmed');
  const ics = rules.icsFor(plain(interview), { title: v.title, candidate: cand.full_name });
  const attach = [{ filename: 'interview.ics', content: ics, contentType: 'text/calendar; method=REQUEST' }];
  const lead = reminder ? 'Reminder: ' : '';
  const sends = [];
  if (cand.email) sends.push(comms.sendEmail(cand.email, `${lead}${interview.type} for ${v.title} at Seventh Sky`, `<p>Dear ${cand.full_name},</p><p>${reminder ? 'This is a reminder of' : 'We would like to invite you to'} a ${interview.type.toLowerCase()} for the ${v.title} position.</p><p><b>When:</b> ${when} (Dhaka time)<br><b>Where:</b> ${where}</p><p>Human Resources, Seventh Sky Private Ltd</p>`, attach, 'hr'));
  panel.filter((p) => p.email).forEach((p) => sends.push(comms.sendEmail(p.email, `${lead}Interview panel: ${cand.full_name} for ${v.title}`, `<p>${p.name},</p><p>You are on the panel for a ${interview.type.toLowerCase()} with ${cand.full_name} (${cand.candidate_code}) for ${v.title} (${v.vacancy_code}).</p><p><b>When:</b> ${when} (Dhaka time)<br><b>Where:</b> ${where}</p><p>Record your evaluation in HR → Recruitment after the interview.</p>`, attach, 'hr')));
  await Promise.all(sends.map((p) => p.catch((e) => console.error('hr interview mail:', e.message))));
}
exports.sendInvites = sendInvites;

exports.scheduleInterview = asyncHandler(async (req, res) => {
  const app = await loadApp(req, res);
  if (!app) return undefined;
  const data = only(req.body, R.FIELDS.interview);
  if (!catalog.INTERVIEW_TYPES.includes(data.type)) return bad(res, 400, 'Choose an interview type from the list');
  const at = new Date(data.scheduled_at);
  if (!data.scheduled_at || Number.isNaN(at.getTime())) return bad(res, 400, 'Choose the date and time');
  if (at.getTime() < Date.now() - 5 * 60000) return bad(res, 400, 'The interview time is in the past');
  const panel = (Array.isArray(data.panel) ? data.panel : []).map(Number).filter(Boolean);
  if (!panel.length) return bad(res, 400, 'Choose at least one person for the interview panel');
  if (rules.CLOSED.includes(app.status)) return bad(res, 409, `This application is ${app.status}`);
  const iv = await sequelize.transaction(async (transaction) => {
    const row = await R.HrInterview.create({ ...data, panel, status: 'scheduled', application_id: app.id, created_by: req.user.id }, { transaction });
    if (rules.allowedNext(app.status).includes('Interview Scheduled')) await store.moveStatus(app, 'Interview Scheduled', { actorId: req.user.id, note: `${data.type} on ${at.toISOString()}`, transaction });
    await store.notify(panel, req.user.branch_id, 'Interview panel', `You are on the panel for a ${data.type.toLowerCase()} on ${at.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}.`, transaction);
    return row;
  });
  sendInvites(iv, app).catch((e) => console.error('hr interview invites:', e.message));
  res.status(201).json(plain(iv));
});

exports.updateInterview = asyncHandler(async (req, res) => {
  const iv = await R.HrInterview.findByPk(req.params.id);
  if (!iv) return bad(res, 404, 'Interview not found');
  const data = only(req.body, R.FIELDS.interview);
  if (data.status && !['scheduled', 'completed', 'cancelled'].includes(data.status)) return bad(res, 400, 'Status must be scheduled, completed or cancelled');
  if (data.rating != null && !(Number(data.rating) >= 1 && Number(data.rating) <= 5)) return bad(res, 400, 'The rating is from 1 to 5');
  if (data.panel) data.panel = (Array.isArray(data.panel) ? data.panel : []).map(Number).filter(Boolean);
  const moved = data.scheduled_at && new Date(data.scheduled_at).getTime() !== new Date(iv.scheduled_at).getTime();
  await sequelize.transaction(async (transaction) => {
    await iv.update({ ...data, ...(moved ? { reminder_sent_at: null } : {}) }, { transaction });
    if (data.status === 'completed') {
      const app = await R.HrApplication.findByPk(iv.application_id, { transaction });
      if (rules.allowedNext(app.status).includes('Interview Completed')) await store.moveStatus(app, 'Interview Completed', { actorId: req.user.id, note: `${iv.type} completed`, transaction });
    }
  });
  if (moved) sendInvites(iv, await R.HrApplication.findByPk(iv.application_id)).catch((e) => console.error('hr interview invites:', e.message));
  res.json(plain(iv));
});

exports.evaluate = asyncHandler(async (req, res) => {
  const iv = await R.HrInterview.findByPk(req.params.id);
  if (!iv) return bad(res, 404, 'Interview not found');
  const onPanel = (iv.panel || []).map(Number).includes(Number(req.user.id));
  if (!onPanel) {
    const { loadSettings, loadContext, hrRoleOf } = require('../services/hrAccess.service');
    const role = hrRoleOf(req.user, await loadContext(req.user));
    if (!can(role, 'rec.manage', await loadSettings())) return bad(res, 403, 'Only the interview panel or HR can score this interview');
  }
  const { scores = {}, recommendation, comments } = req.body || {};
  if (!catalog.RECOMMENDATIONS.includes(recommendation)) return bad(res, 400, 'Choose an overall recommendation');
  const clean = {};
  for (const [k, v] of Object.entries(scores)) {
    if (!catalog.COMPETENCIES.includes(k)) return bad(res, 400, `Unknown competency: ${k}`);
    const n = Number(v);
    if (!(n >= 1 && n <= 5)) return bad(res, 400, `${k}: score from 1 to 5`);
    clean[k] = n;
  }
  if (!Object.keys(clean).length) return bad(res, 400, 'Score at least one competency');
  const existing = await R.HrEvaluation.findOne({ where: { interview_id: iv.id, evaluator_id: req.user.id } });
  const row = existing ? await existing.update({ scores: clean, recommendation, comments: comments || null })
    : await R.HrEvaluation.create({ interview_id: iv.id, evaluator_id: req.user.id, scores: clean, recommendation, comments: comments || null });
  res.status(existing ? 200 : 201).json(plain(row));
});

/* ── Pre-employment checks (M3 §14) ───────────────────────────────────────── */

exports.setCheck = asyncHandler(async (req, res) => {
  const app = await loadApp(req, res);
  if (!app) return undefined;
  const type = req.params.type;
  if (!catalog.CHECK_TYPES.includes(type)) return bad(res, 400, 'Unknown check');
  const { status, required, notes } = req.body || {};
  if (status && !['pending', 'done', 'failed'].includes(status)) return bad(res, 400, 'Status must be pending, done or failed');
  await store.ensureChecks(app.id);
  const chk = await R.HrCheck.findOne({ where: { application_id: app.id, check_type: type } });
  const patch = {};
  if (status) Object.assign(patch, { status, verified_by: status === 'pending' ? null : req.user.id, verified_at: status === 'pending' ? null : new Date() });
  if (required !== undefined) {
    // Only the "if required" checks may be switched off (M3 §14).
    if (!required && !store.OPTIONAL_CHECKS.includes(type)) return bad(res, 400, `${type} is always required`);
    patch.required = Boolean(required);
  }
  if (notes !== undefined) patch.notes = notes || null;
  await chk.update(patch);
  await R.HrApplicationEvent.create({ application_id: app.id, kind: 'note', actor_id: req.user.id, at: new Date(), note: `${type}: ${chk.status}${chk.required ? '' : ' (not required)'}` });
  res.json(plain(chk));
});

/* ── Offers (M3 §15) ──────────────────────────────────────────────────────── */

exports.saveOffer = asyncHandler(async (req, res) => {
  const app = await loadApp(req, res);
  if (!app) return undefined;
  if (app.status !== 'Offer Pending') return bad(res, 409, 'Move the application to Offer Pending first (all required checks done)');
  const data = only(req.body, R.FIELDS.offer);
  const missing = [['salary', 'salary'], ['employment_type', 'employment type'], ['start_date', 'start date']].filter(([k]) => data[k] == null || data[k] === '').map(([, l]) => l);
  if (missing.length) return bad(res, 400, `Required: ${missing.join(', ')}`);
  if (!(Number(data.salary) > 0)) return bad(res, 400, 'Enter the salary');
  const types = (await HrEmployeeType.findAll({ where: { is_active: true }, attributes: ['name'], raw: true })).map((t) => t.name);
  if (!types.includes(data.employment_type)) return bad(res, 400, 'Choose an employment type from the list');
  const refErr = await badRefs(data);
  if (refErr) return bad(res, 400, refErr);
  const vacancy = await R.HrVacancy.findByPk(app.vacancy_id);
  data.position_id = data.position_id || vacancy.position_id;
  const pos = await Org.HrPosition.findByPk(data.position_id);
  if (!pos) return bad(res, 400, 'Choose the position');
  if (!data.supervisor_employee_id && !pos.is_top) return bad(res, 400, 'Choose the supervisor');
  const candidate = await R.HrCandidate.findByPk(app.candidate_id);
  let offer = await R.HrOffer.findOne({ where: { application_id: app.id, status: 'draft' } });
  try {
    const letter_html = await store.renderOffer({ ...data }, { candidate, vacancy });
    if (offer) await offer.update({ ...data, letter_html });
    else offer = await R.HrOffer.create({ ...data, letter_html, application_id: app.id, status: 'draft', created_by: req.user.id });
  } catch (e) { return bad(res, e.status || 500, e.message); }
  res.status(201).json({ ...plain(offer), token_hash: undefined });
});

exports.sendOffer = asyncHandler(async (req, res) => {
  const offer = await R.HrOffer.findByPk(req.params.id);
  if (!offer) return bad(res, 404, 'Offer not found');
  if (offer.status !== 'draft') return bad(res, 409, `This offer is already ${offer.status}`);
  const app = await R.HrApplication.findByPk(offer.application_id);
  if (app.status !== 'Offer Pending') return bad(res, 409, `The application is ${app.status}`);
  const cand = await R.HrCandidate.findByPk(app.candidate_id);
  if (!cand.email) return bad(res, 400, 'Add the candidate\'s email address first');
  const { token, hash } = store.newToken();
  const link = `${publicBase(req)}/offer/${token}`;
  await sequelize.transaction(async (transaction) => {
    await offer.update({ status: 'sent', sent_at: new Date(), token_hash: hash, token_expires_at: new Date(Date.now() + 14 * 86400000) }, { transaction });
    await store.moveStatus(app, 'Offer Sent', { actorId: req.user.id, note: 'Offer letter emailed', transaction });
  });
  const r = await comms.sendEmail(cand.email, 'Your offer of employment from Seventh Sky', `<p>Dear ${cand.full_name},</p><p>We are delighted to offer you a position at Seventh Sky Private Ltd. Please read your offer letter and accept or decline it here:</p><p><a href="${link}">${link}</a></p><p>The link works for 14 days.</p><p>Human Resources, Seventh Sky Private Ltd</p>`, [], 'hr');
  res.json({ message: r && r.success !== false ? 'Offer sent' : 'Offer saved, but the email could not be sent. Copy the link to the candidate.', link, email_sent: Boolean(r && r.success !== false) });
});

/* ── Transfer to the Employee Master (M3 §21) ─────────────────────────────── */

exports.confirmOnboarding = asyncHandler(async (req, res) => {
  const app = await loadApp(req, res);
  if (!app) return undefined;
  if (app.status !== 'Offer Accepted') return bad(res, 409, 'The candidate has not accepted the offer');
  await app.update({ hr_confirmed_at: new Date(), hr_confirmed_by: req.user.id });
  await R.HrApplicationEvent.create({ application_id: app.id, kind: 'note', actor_id: req.user.id, at: new Date(), note: 'HR confirmed onboarding' });
  res.json(plain(app));
});

exports.transfer = asyncHandler(async (req, res) => {
  const { app, verdict } = await store.transferState(req.params.id);
  if (!verdict.ok) return bad(res, 409, 'This candidate cannot be transferred yet', { reasons: verdict.reasons });
  if (app.hire_change_request_id) {
    const cr = await HrChangeRequest.findByPk(app.hire_change_request_id, { attributes: ['status', 'code'] });
    if (cr && cr.status === 'pending') return bad(res, 409, `The hire is already waiting for approval (${cr.code})`);
  }
  const cand = await R.HrCandidate.findByPk(app.candidate_id);
  const cr = await raise(req, { kind: 'rec.hire', entity_type: 'application', entity_id: app.id, payload: { application_id: app.id, candidate: cand.full_name, candidate_code: cand.candidate_code } });
  await app.update({ hire_change_request_id: cr.id });
  await R.HrApplicationEvent.create({ application_id: app.id, kind: 'note', actor_id: req.user.id, at: new Date(), note: `Transfer to the Employee Master sent for approval (${cr.code})` });
  res.status(202).json({ message: 'Sent to the HR Manager for approval', change_request: { id: cr.id, code: cr.code } });
});

/* ── Panel: people who can sit on an interview ────────────────────────────── */

exports.panelOptions = asyncHandler(async (req, res) => {
  const { NON_STAFF } = require('../utils/hrRoles');
  const users = await User.findAll({ where: { status: 'active', role: { [Op.notIn]: NON_STAFF } }, attributes: ['id', 'name', 'email', 'role'], order: [['name', 'ASC']], limit: 500, raw: true });
  res.json({ data: users });
});
