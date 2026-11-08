/**
 * /api/hr/approvals: the inbox for HR change requests (plan Task 6; M1 §6, M2 §9, M3 §5).
 *
 * scope=mine lists what the viewer may decide now, scope=waiting what they raised, scope=all everything (HR
 * and the CEO). A decision advances the chain; the last approval applies the change in the same
 * transaction, so a change is never half-approved. Each decision notifies the next approvers and the requester.
 */
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const { asyncHandler, getPagination } = require('../utils/controllerHelpers');
const { HrChangeRequest } = require('../models/hrChange');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { canAct, advance, LABELS } = require('../services/hrApproval.service');
const { hrRoleOf, ROLE_LABELS, maskPayload } = require('../services/hrAccess.service');
const { appliers } = require('../services/hrAppliers');

const SEE_ALL = ['ceo', 'hr_manager', 'hr_officer'];

// Names for the ids a request refers to, so the inbox reads "Property Care", not "1".
const REF = {
  division_id: 'HrDivision', department_id: 'HrDepartment', team_id: 'HrTeam', reports_to_position_id: 'HrPosition', position_id: 'HrPosition',
  salary_grade_id: 'HrSalaryGrade', cost_centre_id: 'HrCostCentre', company_id: 'HrCompany',
  supervisor_employee_id: 'HrEmployee', manager_employee_id: 'HrEmployee', head_employee_id: 'HrEmployee', leader_employee_id: 'HrEmployee',
};
const refModel = (name) => (name === 'HrEmployee' ? require('../models/hrEmployee').HrEmployee : require('../models/hrOrganisation')[name]);
const refNames = async (rows) => {
  const want = {};
  rows.forEach((r) => [r.payload, r.before].forEach((o) => Object.entries(o || {}).forEach(([k, v]) => { if (REF[k] && v != null) (want[k] = want[k] || new Set()).add(Number(v)); })));
  const out = {};
  for (const [k, ids] of Object.entries(want)) {
    const found = await refModel(REF[k]).findAll({ where: { id: [...ids] }, raw: true });
    out[k] = Object.fromEntries(found.map((x) => [x.id, x.title || x.full_name || x.name]));
  }
  // The employee a request is about, by name and code.
  const empIds = [...new Set(rows.filter((r) => r.entity_type === 'employee' && r.entity_id).map((r) => r.entity_id))];
  const emps = empIds.length ? await refModel('HrEmployee').findAll({ where: { id: empIds }, attributes: ['id', 'full_name', 'employee_code'], raw: true }) : [];
  out.$employee = Object.fromEntries(emps.map((e) => [e.id, `${e.full_name} (${e.employee_code})`]));
  // Recruitment: the position a vacancy request is for, and the candidate a hire is about.
  const R = require('../models/hrRecruitment');
  const wrIds = rows.filter((r) => r.entity_type === 'workforce_request' && r.entity_id).map((r) => r.entity_id);
  const wrs = wrIds.length ? await R.HrWorkforceRequest.findAll({ where: { id: wrIds }, attributes: ['id', 'position_id', 'vacancies_count'], raw: true }) : [];
  const wrPos = wrs.length ? await refModel('HrPosition').findAll({ where: { id: wrs.map((w) => w.position_id) }, attributes: ['id', 'title'], raw: true }) : [];
  out.$workforce_request = Object.fromEntries(wrs.map((w) => [w.id, `${w.vacancies_count} × ${(wrPos.find((p) => p.id === w.position_id) || {}).title || 'position'}`]));
  const appIds = rows.filter((r) => r.entity_type === 'application' && r.entity_id).map((r) => r.entity_id);
  const apps = appIds.length ? await R.HrApplication.findAll({ where: { id: appIds }, attributes: ['id', 'candidate_id'], raw: true }) : [];
  const cands = apps.length ? await R.HrCandidate.findAll({ where: { id: apps.map((a) => a.candidate_id) }, attributes: ['id', 'full_name', 'candidate_code'], raw: true }) : [];
  out.$application = Object.fromEntries(apps.map((a) => { const c = cands.find((x) => x.id === a.candidate_id); return [a.id, c ? `${c.full_name} (${c.candidate_code})` : null]; }));
  const runIds = rows.filter((r) => r.entity_type === 'pay_run' && r.entity_id).map((r) => r.entity_id);
  const runs = runIds.length ? await require('../models/hrPay').HrPayRun.findAll({ where: { id: runIds }, attributes: ['id', 'month', 'year'], raw: true }) : [];
  out.$pay_run = Object.fromEntries(runs.map((r) => [r.id, `${require('../services/hrPayStore').monthName(r.month, r.year)} payroll`]));
  return out;
};
const withNames = (o, names) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, REF[k] && v != null ? ((names[k] || {})[v] || `#${v}`) : v]));
const actorOf = (req) => ({ id: req.user.id, hrRole: req.hrRole });

/** Request as the screen shows it: label, requester name, whether the viewer may decide it. */
const shape = (row, req, names, refs = {}) => {
  const r = row.get({ plain: true });
  const step = r.chain[r.step];
  const deciding = canAct(r, actorOf(req));
  const view = (o) => maskPayload(o, { hrRole: req.hrRole, deciding, settings: req.hrSettings });
  const payload = view(r.payload);
  const before = view(r.before);
  return {
    ...r,
    payload: payload.payload,
    before: before.payload,
    hidden_fields: [...new Set([...payload.hidden, ...before.hidden])],
    label: LABELS[r.kind] || r.kind,
    requested_by_name: names[r.requested_by] || null,
    waiting_for: r.status === 'pending' && step ? ROLE_LABELS[step.role] : null,
    chain: r.chain.map((s) => ({ ...s, role_label: ROLE_LABELS[s.role], decided_by_name: s.decided_by ? names[s.decided_by] || null : null })),
    can_decide: deciding,
    can_withdraw: r.status === 'pending' && Number(r.requested_by) === Number(req.user.id),
    entity_name: r.entity_type === 'employee' ? ((refs.$employee || {})[r.entity_id] || (r.payload && r.payload.full_name) || null)
      : ((refs[`$${r.entity_type}`] || {})[r.entity_id] || null),
    payload_display: withNames(payload.payload, refs),
    before_display: withNames(before.payload, refs),
  };
};
const namesFor = async (rows) => {
  const ids = new Set();
  rows.forEach((r) => { ids.add(r.requested_by); (r.chain || []).forEach((s) => s.decided_by && ids.add(s.decided_by)); });
  const users = await User.findAll({ where: { id: [...ids].filter(Boolean) }, attributes: ['id', 'name'], raw: true });
  return Object.fromEntries(users.map((u) => [u.id, u.name]));
};

/** Staff users whose HR role is `role`. Department managers come from employee records (Task 9). */
const usersInRole = async (role) => {
  const users = await User.findAll({ where: { status: 'active' }, attributes: ['id', 'role', 'branch_id'], raw: true });
  return users.filter((u) => hrRoleOf(u) === role);
};
const notify = (userIds, branchId, title, message, type = 'info') => Promise.all([...new Set(userIds)].map((user_id) => Notification.create({ user_id, branch_id: branchId, title, message, type })));

const tell = async (r, actorId) => {
  const label = LABELS[r.kind] || r.kind;
  if (r.status === 'pending') {
    const next = r.chain[r.step];
    const to = (await usersInRole(next.role)).map((u) => u.id).filter((id) => id !== Number(r.requested_by));
    return notify(to, r.branch_id, `${label} needs your approval`, `${r.code} is waiting for the ${ROLE_LABELS[next.role]}.`);
  }
  const done = r.status === 'approved';
  const to = [r.requested_by];
  // M1 §9: structure changes are announced to HR and the CEO; affected department managers join in Task 9.
  if (done && r.kind.startsWith('org.')) (await Promise.all(['ceo', 'hr_manager'].map(usersInRole))).flat().forEach((u) => to.push(u.id));
  return notify(to.filter((id) => id && id !== actorId), r.branch_id, `${label} ${done ? 'approved' : 'rejected'}`,
    `${r.code} was ${done ? 'approved and applied' : 'rejected'}.`, done ? 'success' : 'warning');
};

/** Rows for one inbox tab. mine: I may decide now. waiting: I raised, still open. open: every open request (HR).
 *  decided: finished requests (HR sees all, everyone else their own). */
const scoped = async (scope, req) => {
  const me = actorOf(req);
  const seeAll = SEE_ALL.includes(req.hrRole);
  const where = {};
  if (scope === 'mine') Object.assign(where, { status: 'pending', requested_by: { [Op.ne]: req.user.id } });
  else if (scope === 'waiting') Object.assign(where, { status: 'pending', requested_by: req.user.id });
  else if (scope === 'open') { if (!seeAll) return null; where.status = 'pending'; }
  else if (scope === 'decided') { where.status = { [Op.ne]: 'pending' }; if (!seeAll) where.requested_by = req.user.id; }
  else return undefined;
  const rows = await HrChangeRequest.findAll({ where, order: [['id', 'DESC']] });
  return scope === 'mine' ? rows.filter((r) => canAct(r.get({ plain: true }), me)) : rows;
};
const SCOPES = ['mine', 'waiting', 'open', 'decided'];

exports.list = asyncHandler(async (req, res) => {
  const scope = req.query.scope || 'mine';
  const { limit, offset, page } = getPagination(req);
  const rows = await scoped(scope, req);
  if (rows === undefined) return res.status(400).json({ error: 'Unknown list' });
  if (rows === null) return res.status(403).json({ error: 'You do not have access to this' });
  const counts = {};
  for (const s of SCOPES) { const r = await scoped(s, req); if (r) counts[s] = r.length; }
  const pageRows = rows.slice(offset, offset + limit);
  const plainRows = pageRows.map((r) => r.get({ plain: true }));
  const [names, refs] = await Promise.all([namesFor(plainRows), refNames(plainRows)]);
  return res.json({ data: pageRows.map((r) => shape(r, req, names, refs)), total: rows.length, page, counts });
});

exports.get = asyncHandler(async (req, res) => {
  const row = await HrChangeRequest.findByPk(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const r = row.get({ plain: true });
  const mayView = SEE_ALL.includes(req.hrRole) || Number(r.requested_by) === Number(req.user.id) || canAct(r, actorOf(req));
  if (!mayView) return res.status(403).json({ error: 'You do not have access to this' });
  return res.json(shape(row, req, await namesFor([r]), await refNames([r])));
});

exports.decide = asyncHandler(async (req, res) => {
  const { decision, comment } = req.body || {};
  if (decision === 'reject' && !String(comment || '').trim()) return res.status(400).json({ error: 'Say why it is rejected' });
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const row = await HrChangeRequest.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!row) throw Object.assign(new Error('Not found'), { status: 404 });
      const next = advance(row.get({ plain: true }), actorOf(req), decision, comment, Date.now());
      let entity = null;
      if (next.status === 'approved') {
        entity = await appliers[next.kind](next, req, { transaction });
        if (!next.entity_id && entity && entity.id) next.entity_id = entity.id;
      }
      await row.update({ chain: next.chain, step: next.step, status: next.status, entity_id: next.entity_id }, { transaction });
      return { row, entity };
    });
    tell(result.row.get({ plain: true }), req.user.id).catch((e) => console.error('hr approval notify:', e.message));
    const done = result.row.get({ plain: true });
    return res.json({ request: shape(result.row, req, await namesFor([done]), await refNames([done])), entity: result.entity });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

exports.withdraw = asyncHandler(async (req, res) => {
  const row = await HrChangeRequest.findByPk(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (Number(row.requested_by) !== Number(req.user.id)) return res.status(403).json({ error: 'Only the person who raised it can withdraw it' });
  if (row.status !== 'pending') return res.status(400).json({ error: 'It has already been decided' });
  await row.update({ status: 'withdrawn' });
  const r = row.get({ plain: true });
  return res.json(shape(row, req, await namesFor([r]), await refNames([r])));
});

// GET /api/hr/approvals/badges: the sidebar count of requests waiting for this person.
exports.badges = asyncHandler(async (req, res) => {
  const mine = await scoped('mine', req);
  res.json({ badges: mine.length ? { '/hr/approvals': { count: mine.length } } : {} });
});
