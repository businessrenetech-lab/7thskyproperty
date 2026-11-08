/**
 * Recruitment writes that more than one caller needs (the admin API, the public careers API and the approval
 * appliers). Rules live in hrRecruitment.service.js; this file stores their results.
 *
 *   approveVacancy  applier for rec.vacancy: the approved workforce request becomes a published vacancy (M3 §5)
 *   hire            applier for rec.hire: the candidate becomes an employee in Onboarding (M3 §21, M2 Task 11 path)
 *   moveStatus      one status change + its event row (M3 §10: user, date and time)
 *   ensureChecks    the M3 §14 list on an application; Police and Medical are "if required", so optional
 *   renderOffer     the offer letter from the active hr_offer agreement template (M3 §15)
 */
const crypto = require('crypto');
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const R = require('../models/hrRecruitment');
const Org = require('../models/hrOrganisation');
const { HrEmployee, HrEmployeeDocument } = require('../models/hrEmployee');
const { HrChangeRequest } = require('../models/hrChange');
const User = require('../models/User');
const Notification = require('../models/Notification');
const rules = require('./hrRecruitment.service');
const { CHECK_TYPES } = require('../config/hrCatalog');

const fail = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });
const plain = (row) => (row && row.get ? row.get({ plain: true }) : row);
const inTx = (outer, fn) => (outer ? fn(outer) : sequelize.transaction(fn));
const year = () => Number(rules.dhakaDate(new Date()).slice(0, 4));

async function nextCode(Model, field, prefix, transaction) {
  const last = await Model.findOne({ where: { [field]: { [Op.like]: `${prefix}%` } }, order: [['id', 'DESC']], attributes: [field], transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined });
  return rules.nextYearCode(prefix, year(), last ? last[field] : null);
}

async function moveStatus(app, to, { actorId = null, note = null, transaction } = {}) {
  const from = app.status;
  await app.update({ status: to }, { transaction });
  await R.HrApplicationEvent.create({ application_id: app.id, kind: 'status', from_status: from, to_status: to, actor_id: actorId, at: new Date(), note }, { transaction });
  // A closed application keeps no interviews on the calendar, so nobody is reminded of one.
  if (rules.CLOSED.includes(to)) await R.HrInterview.update({ status: 'cancelled' }, { where: { application_id: app.id, status: 'scheduled' }, transaction });
  return app;
}

const OPTIONAL_CHECKS = ['Police Clearance', 'Medical Assessment'];
async function ensureChecks(applicationId, transaction) {
  const have = new Set((await R.HrCheck.findAll({ where: { application_id: applicationId }, attributes: ['check_type'], transaction })).map((c) => c.check_type));
  const missing = CHECK_TYPES.filter((t) => !have.has(t));
  if (missing.length) await R.HrCheck.bulkCreate(missing.map((t) => ({ application_id: applicationId, check_type: t, required: !OPTIONAL_CHECKS.includes(t), status: 'pending' })), { transaction });
}

const usersWithHrRole = async (roles, transaction) => {
  const { hrRoleOf } = require('./hrAccess.service');
  const users = await User.findAll({ where: { status: 'active' }, attributes: ['id', 'role', 'branch_id'], raw: true, transaction });
  return users.filter((u) => roles.includes(hrRoleOf(u))).map((u) => u.id);
};
const notify = (ids, branchId, title, message, transaction) => Promise.all([...new Set(ids.filter(Boolean))]
  .map((user_id) => Notification.create({ user_id, branch_id: branchId || null, title, message, type: 'info' }, { transaction })));

/** Applier for rec.vacancy. */
async function approveVacancy(request, req, { transaction } = {}) {
  const wr = await R.HrWorkforceRequest.findByPk(request.entity_id, { transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined });
  if (!wr) throw fail(404, 'Workforce request not found');
  if (wr.status !== 'pending') throw fail(409, 'This workforce request has already been decided');
  const pos = wr.position_id ? await Org.HrPosition.findByPk(wr.position_id, { transaction }) : null;
  const jd = wr.job_description_id ? await R.HrJobDescription.findByPk(wr.job_description_id, { transaction }) : null;
  const code = await nextCode(R.HrVacancy, 'vacancy_code', 'VAC-', transaction);
  const title = (jd && jd.title) || (pos && pos.title) || 'Vacancy';
  const vacancy = await R.HrVacancy.create({
    branch_id: wr.location_branch_id || wr.branch_id, vacancy_code: code, workforce_request_id: wr.id,
    department_id: wr.department_id, position_id: wr.position_id, reports_to_position_id: wr.reports_to_position_id || (pos && pos.reports_to_position_id) || null,
    employment_type: wr.employment_type, salary_grade_id: wr.salary_grade_id, salary_min: wr.salary_min, salary_max: wr.salary_max,
    location_branch_id: wr.location_branch_id, positions_count: wr.vacancies_count || 1, closing_date: wr.closing_date, priority: wr.priority,
    job_description_id: wr.job_description_id, status: 'published', published_at: new Date(),
    channels: ['Seventh Sky Website', 'Careers Portal', 'Internal Vacancy Board'], public_slug: rules.vacancySlug(title, code), created_by: wr.requested_by,
  }, { transaction });
  await wr.update({ status: 'approved' }, { transaction });
  await notify([wr.requested_by, ...(await usersWithHrRole(['hr_manager', 'hr_officer'], transaction))], wr.branch_id, 'Vacancy published', `${code} ${title} is approved and open for applications.`, transaction);
  return plain(vacancy);
}

/** Workforce-request approvals as the canTransfer list. */
async function vacancyApprovals(vacancy, transaction) {
  if (!vacancy.workforce_request_id) return [];
  const wr = await R.HrWorkforceRequest.findByPk(vacancy.workforce_request_id, { attributes: ['change_request_id'], transaction });
  const cr = wr && wr.change_request_id ? await HrChangeRequest.findByPk(wr.change_request_id, { attributes: ['status'], transaction }) : null;
  return cr ? [{ status: cr.status }] : [];
}

/** Everything canTransfer needs for one application. */
async function transferState(applicationId, transaction) {
  const app = await R.HrApplication.findByPk(applicationId, { transaction });
  if (!app) throw fail(404, 'Application not found');
  const vacancy = await R.HrVacancy.findByPk(app.vacancy_id, { transaction });
  const offer = await R.HrOffer.findOne({ where: { application_id: app.id }, order: [['id', 'DESC']], transaction });
  const checks = (await R.HrCheck.findAll({ where: { application_id: app.id }, transaction })).map(plain);
  const approvals = await vacancyApprovals(vacancy, transaction);
  const verdict = rules.canTransfer(plain(app), plain(offer), checks, approvals, Boolean(app.hr_confirmed_at));
  return { app, vacancy, offer, checks, approvals, verdict };
}

const addMonths = (ymd, n) => { if (!ymd || !n) return null; const d = new Date(`${String(ymd).slice(0, 10)}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + Number(n)); return d.toISOString().slice(0, 10); };

/** Applier for rec.hire. */
async function hire(request, req, { transaction } = {}) {
  const { app, vacancy, offer, verdict } = await transferState(request.entity_id, transaction);
  if (!verdict.ok) throw fail(409, verdict.reasons.join(' '), { reasons: verdict.reasons });
  const cand = await R.HrCandidate.findByPk(app.candidate_id, { transaction });
  const dep = vacancy.department_id ? await Org.HrDepartment.findByPk(vacancy.department_id, { transaction }) : null;
  const div = dep ? await Org.HrDivision.findByPk(dep.division_id, { transaction }) : null;
  const positionId = offer.position_id || vacancy.position_id;
  const pos = positionId ? await Org.HrPosition.findByPk(positionId, { transaction }) : null;
  const data = {
    full_name: cand.full_name, date_of_birth: cand.date_of_birth, national_id: cand.national_id || null,
    personal_mobile: cand.mobile, personal_email: cand.email, present_address: cand.address,
    company_id: div ? div.company_id : null, division_id: dep ? dep.division_id : null, department_id: vacancy.department_id,
    team_id: pos && pos.team_id ? pos.team_id : null, position_id: positionId, supervisor_employee_id: offer.supervisor_employee_id,
    employee_type: offer.employment_type || vacancy.employment_type, status: 'Onboarding',
    joining_date: offer.start_date, probation_end_date: addMonths(offer.start_date, offer.probation_months),
    work_location_branch_id: offer.work_location_branch_id || vacancy.location_branch_id || null, salary_grade_id: vacancy.salary_grade_id || null,
    basic_salary: offer.salary,
  };
  // A customer account cannot become a staff login (M2 rule); the employee is still created, without one.
  const { canLinkLogin } = require('./hrEmployee.service');
  const existing = cand.email ? await User.findOne({ where: { email: String(cand.email).toLowerCase() }, attributes: ['id', 'role'], transaction }) : null;
  const login = cand.email && canLinkLogin(existing) ? { email: cand.email, role: 'employee' } : {};
  const emp = await require('./hrEmployeeStore').createEmployee(data, req, { change_request_id: request.id, transaction, login });

  const docs = await R.HrCandidateDocument.findAll({ where: { candidate_id: cand.id }, transaction });
  if (docs.length) {
    await HrEmployeeDocument.bulkCreate(docs.map((d) => ({
      employee_id: emp.id, doc_type: d.doc_type, file_url: d.file_url, file_name: d.file_name, uploaded_by: d.uploaded_by, notes: `From candidate ${cand.candidate_code}`,
    })), { transaction });
  }
  // The offer letter the candidate accepted goes on the file too.
  await app.update({ hired_employee_id: emp.id }, { transaction });
  await R.HrApplicationEvent.create({ application_id: app.id, kind: 'note', actor_id: req.user ? req.user.id : null, at: new Date(), note: `Transferred to the Employee Master as ${emp.employee_code}` }, { transaction });
  const filled = (vacancy.filled_count || 0) + 1;
  await vacancy.update({ filled_count: filled, ...(filled >= vacancy.positions_count ? { status: 'filled', closed_at: new Date() } : {}) }, { transaction });
  await cand.update({ in_talent_pool: false, archived_at: null }, { transaction });
  if (filled >= vacancy.positions_count) await closeOpenApplications(vacancy.id, req, transaction, 'The vacancy has been filled');
  return emp;
}

/** M3 §17 "archive unsuccessful candidates": when a vacancy closes, open applications end as Not Selected. */
async function closeOpenApplications(vacancyId, req, transaction, note) {
  const open = await R.HrApplication.findAll({ where: { vacancy_id: vacancyId, status: { [Op.notIn]: rules.CLOSED } }, transaction });
  for (const a of open) await moveStatus(a, 'Not Selected', { actorId: req.user ? req.user.id : null, note, transaction });
  // Candidates with nothing else open are archived (still searchable, M3 §9) unless they are in the talent pool.
  for (const candId of [...new Set(open.map((a) => a.candidate_id))]) {
    const still = await R.HrApplication.count({ where: { candidate_id: candId, status: { [Op.notIn]: rules.CLOSED } }, transaction });
    if (!still) await R.HrCandidate.update({ archived_at: new Date() }, { where: { id: candId, in_talent_pool: false, archived_at: null }, transaction });
  }
  return open.length;
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDay = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');
const fmtMoney = (n) => (n == null || n === '' ? '' : `BDT ${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);

/** The letter is shown on a public page, so the staff-written template loses anything that could run there. */
const stripActive = (html) => String(html || '')
  .replace(/<(script|style|iframe|object|embed|form|link|meta|base)\b[\s\S]*?(<\/\1\s*>|$)/gi, '')
  .replace(/<(script|iframe|object|embed|link|meta|base)\b[^>]*>/gi, '')
  .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  .replace(/(href|src|xlink:href|action|formaction)\s*=\s*(["']?)\s*(javascript|vbscript|data):[^"'\s>]*\2/gi, '$1="#"');

/** The offer letter: the active hr_offer template with {{fields}} filled in (values escaped). */
async function renderOffer(offer, { candidate, vacancy, transaction }) {
  const AgreementTemplate = require('../models/AgreementTemplate');
  const tpl = await AgreementTemplate.findOne({ where: { category: 'hr_offer', status: 'active' }, order: [['id', 'DESC']], transaction });
  if (!tpl) throw fail(409, 'There is no approved offer letter template. Run node scripts/seedHrOfferLetter.js or add an active template in the hr_offer category.');
  const [pos, dep, sup, loc] = await Promise.all([
    offer.position_id ? Org.HrPosition.findByPk(offer.position_id, { transaction }) : null,
    vacancy.department_id ? Org.HrDepartment.findByPk(vacancy.department_id, { transaction }) : null,
    offer.supervisor_employee_id ? HrEmployee.findByPk(offer.supervisor_employee_id, { attributes: ['full_name'], transaction }) : null,
    offer.work_location_branch_id ? require('../models/Branch').findByPk(offer.work_location_branch_id, { attributes: ['name'], transaction }) : null,
  ]);
  const values = {
    company_name: 'Seventh Sky Private Ltd', offer_date: fmtDay(new Date().toISOString()), candidate_name: candidate.full_name,
    candidate_address: candidate.address || '', position_title: pos ? pos.title : '', department: dep ? dep.name : '', vacancy_code: vacancy.vacancy_code,
    salary: fmtMoney(offer.salary), employment_type: offer.employment_type || '', probation_months: offer.probation_months != null ? String(offer.probation_months) : '',
    start_date: fmtDay(offer.start_date), supervisor_name: sup ? sup.full_name : '', work_location: loc ? loc.name : '',
  };
  return stripActive(tpl.content_html).replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, k) => (k in values ? esc(values[k]) : m));
}

const newToken = () => { const token = crypto.randomBytes(24).toString('hex'); return { token, hash: crypto.createHash('sha256').update(token).digest('hex') }; };
const hashToken = (t) => crypto.createHash('sha256').update(String(t || '')).digest('hex');

module.exports = {
  fail, plain, inTx, nextCode, moveStatus, ensureChecks, approveVacancy, hire, transferState, vacancyApprovals, closeOpenApplications,
  renderOffer, stripActive, newToken, hashToken, notify, usersWithHrRole, OPTIONAL_CHECKS,
};
