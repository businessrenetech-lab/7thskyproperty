/**
 * /api/hr/performance (plan Task 28), ported from Hadi Real Estate's PerformanceReviews: six criteria rated 1–5,
 * strengths, improvements and goals. HR (perf.manage) reviews anyone; a supervisor reviews the people below them.
 * draft → submitted (the employee is told) → acknowledged by the employee, with an optional comment.
 */
const { Op } = require('sequelize');
const { asyncHandler } = require('../utils/controllerHelpers');
const { HrPerformanceReview } = require('../models/hrPay');
const { HrEmployee } = require('../models/hrEmployee');
const User = require('../models/User');
const access = require('../services/hrAccess.service');
const rules = require('../services/hrPay.service');
const { upline } = require('../services/hrEmployee.service');
const { notify } = require('../services/hrRecruitmentStore');

const bad = (res, error, status = 400) => res.status(status).json({ error });
const TEXT = ['strengths', 'improvements', 'goals'];
const ON_ROSTER = { archived_at: null, status: { [Op.notIn]: ['Applicant', 'Offer Accepted', 'Inactive', 'Resigned', 'Terminated', 'Retired', 'Deceased'] } };
const dateOk = (v) => v == null || v === '' || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)));

/** Who this person may review: everyone for HR, otherwise the people whose upline includes them. */
async function reviewable(req) {
  const settings = req.hrSettings || await access.loadSettings();
  const ctx = req.hrContext || await access.loadContext(req.user);
  const role = access.hrRoleOf(req.user, ctx);
  const all = await HrEmployee.findAll({ where: { archived_at: null }, attributes: ['id', 'employee_code', 'full_name', 'supervisor_employee_id', 'status', 'user_id'], raw: true });
  const hr = access.can(role, 'perf.manage', settings);
  const me = ctx.employee ? ctx.employee.id : null;
  const ids = new Set(all.filter((e) => e.id !== me && (hr || (me && upline(all, e.id).includes(me)))).map((e) => e.id));
  return { hr, me, ids, all };
}

async function shape(rows) {
  const emps = rows.length ? await HrEmployee.findAll({ where: { id: rows.map((r) => r.employee_id) }, attributes: ['id', 'employee_code', 'full_name'], raw: true }) : [];
  const users = rows.length ? await User.findAll({ where: { id: rows.map((r) => r.reviewer_user_id).filter(Boolean) }, attributes: ['id', 'name'], raw: true }) : [];
  return rows.map((r) => {
    const e = emps.find((x) => x.id === r.employee_id) || {};
    let ratings = r.ratings;
    if (typeof ratings === 'string') { try { ratings = JSON.parse(ratings); } catch { ratings = {}; } }
    const ordered = Object.fromEntries(rules.REVIEW_CRITERIA.filter((c) => ratings && ratings[c] != null).map((c) => [c, ratings[c]]));   // the database reorders JSON keys
    return { ...r, ratings: ordered, employee_code: e.employee_code, full_name: e.full_name, reviewer_name: (users.find((u) => u.id === r.reviewer_user_id) || {}).name || null };
  });
}

function clean(body) {
  const b = body || {};
  const out = {};
  if ('period_label' in b) out.period_label = b.period_label ? String(b.period_label).trim().slice(0, 60) : null;
  if ('period_start' in b) out.period_start = b.period_start || null;
  if ('period_end' in b) out.period_end = b.period_end || null;
  TEXT.forEach((k) => { if (k in b) out[k] = b[k] ? String(b[k]).slice(0, 5000) : null; });
  if ('ratings' in b) {
    const r = b.ratings && typeof b.ratings === 'object' ? b.ratings : {};
    out.ratings = Object.fromEntries(rules.REVIEW_CRITERIA.filter((c) => r[c] != null && r[c] !== '').map((c) => [c, Number(r[c])]));
    out.overall = rules.reviewOverall(out.ratings);
  }
  return out;
}

const invalid = (data) => {
  if (!dateOk(data.period_start) || !dateOk(data.period_end)) return 'Dates must be real dates';
  if (data.period_start && data.period_end && data.period_end < data.period_start) return 'The period ends before it starts';
  if (data.ratings && Object.values(data.ratings).some((v) => !Number.isInteger(v) || v < 1 || v > 5)) return 'Each rating is 1 to 5';
  return null;
};

exports.meta = asyncHandler(async (req, res) => {
  const { hr, ids, all } = await reviewable(req);
  const people = all.filter((e) => ids.has(e.id) && !['Applicant', 'Offer Accepted', 'Inactive'].includes(e.status))
    .map((e) => ({ employee_code: e.employee_code, full_name: e.full_name })).sort((a, b) => a.full_name.localeCompare(b.full_name));
  res.json({ criteria: rules.REVIEW_CRITERIA, canManage: hr, people });
});

exports.list = asyncHandler(async (req, res) => {
  const { hr, ids } = await reviewable(req);
  const where = hr ? {} : { [Op.or]: [{ employee_id: [...ids] }, { reviewer_user_id: req.user.id }] };
  if (req.query.status) where.status = String(req.query.status).split(',');
  const rows = await HrPerformanceReview.findAll({ where, order: [['updated_at', 'DESC']], limit: 500, raw: true });
  res.json({ data: await shape(rows) });
});

exports.mine = asyncHandler(async (req, res) => {
  const ctx = req.hrContext || await access.loadContext(req.user);
  if (!ctx.employee) return res.json({ data: [] });
  const rows = await HrPerformanceReview.findAll({ where: { employee_id: ctx.employee.id, status: ['submitted', 'acknowledged'] }, order: [['submitted_at', 'DESC']], raw: true });
  return res.json({ data: await shape(rows) });
});

exports.create = asyncHandler(async (req, res) => {
  const { ids } = await reviewable(req);
  const emp = await HrEmployee.findOne({ where: { employee_code: String((req.body || {}).employee_code || ''), ...ON_ROSTER }, attributes: ['id'], raw: true });
  if (!emp) return bad(res, 'Choose an employee');
  if (!ids.has(emp.id)) return bad(res, 'You can review only the people below you', 403);
  const data = clean(req.body);
  const err = invalid(data);
  if (err) return bad(res, err);
  if (!data.period_label) return bad(res, 'Name the period, for example "2026 mid-year"');
  const row = await HrPerformanceReview.create({ ...data, employee_id: emp.id, reviewer_user_id: req.user.id, status: 'draft', branch_id: req.user.branch_id || null });
  const [out] = await shape([row.get({ plain: true })]);
  return res.status(201).json(out);
});

async function editable(req, res) {
  const row = await HrPerformanceReview.findByPk(req.params.id);
  if (!row) { bad(res, 'Review not found', 404); return null; }
  const { hr, ids } = await reviewable(req);
  if (!(hr || (row.reviewer_user_id === req.user.id && ids.has(row.employee_id)))) { bad(res, 'Only the reviewer or HR can change this review', 403); return null; }
  if (row.status !== 'draft') { bad(res, 'A submitted review cannot be changed', 409); return null; }
  return row;
}

exports.update = asyncHandler(async (req, res) => {
  const row = await editable(req, res);
  if (!row) return undefined;
  const data = clean(req.body);
  const err = invalid({ ...row.get({ plain: true }), ...data });
  if (err) return bad(res, err);
  await row.update(data);
  const [out] = await shape([row.get({ plain: true })]);
  return res.json(out);
});

exports.submit = asyncHandler(async (req, res) => {
  const row = await editable(req, res);
  if (!row) return undefined;
  const overall = rules.reviewOverall(row.ratings);
  if (overall == null) return bad(res, `Rate all six: ${rules.REVIEW_CRITERIA.join(', ')}`);
  await row.update({ overall, status: 'submitted', submitted_at: new Date() });
  const emp = await HrEmployee.findByPk(row.employee_id, { attributes: ['user_id'], raw: true });
  if (emp && emp.user_id) await notify([emp.user_id], req.user.branch_id, 'Performance review', `Your ${row.period_label} review is ready to read in My HR.`);
  const [out] = await shape([row.get({ plain: true })]);
  return res.json(out);
});

exports.acknowledge = asyncHandler(async (req, res) => {
  const row = await HrPerformanceReview.findByPk(req.params.id);
  if (!row) return bad(res, 'Review not found', 404);
  const ctx = req.hrContext || await access.loadContext(req.user);
  if (!ctx.employee || ctx.employee.id !== row.employee_id) return bad(res, 'Only the person reviewed can acknowledge it', 403);
  if (row.status !== 'submitted') return bad(res, row.status === 'acknowledged' ? 'Already acknowledged' : 'This review is not ready yet', 409);
  const comment = (req.body || {}).comment ? String(req.body.comment).slice(0, 5000) : null;
  await row.update({ status: 'acknowledged', acknowledged_at: new Date(), employee_comment: comment });
  if (row.reviewer_user_id) await notify([row.reviewer_user_id], req.user.branch_id, 'Review acknowledged', `${req.user.name || 'The employee'} acknowledged the ${row.period_label} review.`);
  const [out] = await shape([row.get({ plain: true })]);
  return res.json(out);
});

exports.remove = asyncHandler(async (req, res) => {
  const row = await editable(req, res);
  if (!row) return undefined;
  await row.destroy();
  return res.status(204).end();
});
