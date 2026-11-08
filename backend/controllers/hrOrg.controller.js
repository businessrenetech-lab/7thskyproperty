/**
 * /api/hr/org: the organisation structure (plan Task 5, client spec Module 1).
 *
 * Changes the spec says need approval (M1 §6: new department, new position, position deletion, reporting
 * line, salary grade, restructure) are not written: they return 202 with a change request for the HR Manager
 * and the CEO. Everything else is written straight away and logged in hr_history. Rows are deactivated,
 * never deleted. Cost centres and salary grades need org.view_cost (M1 §7).
 */
const { Op } = require('sequelize');
const { asyncHandler, getPagination } = require('../utils/controllerHelpers');
const M = require('../models/hrOrganisation');
const org = require('../services/hrOrg.service');
const { can } = require('../services/hrAccess.service');
const { raise } = require('../services/hrRequests');
const { LEVELS, createEntity, updateEntity, activeChildren, activeEmployees, reportingLoopMessage, plain, only } = require('../services/hrOrgStore');

const levelOf = (req, res) => {
  const L = LEVELS[req.params.level];
  if (!L) { res.status(404).json({ error: 'Unknown organisation level' }); return null; }
  if (L.cost && !can(req.hrRole, 'org.view_cost', req.hrSettings)) { res.status(403).json({ error: 'You do not have access to this' }); return null; }
  return L;
};
const stripCost = (req, L, row) => {
  if (!row || can(req.hrRole, 'org.view_cost', req.hrSettings)) return row;
  const out = { ...row };
  (L.costFields || []).forEach((f) => { delete out[f]; });
  return out;
};
const writeOnly = (req, res) => {
  if (!can(req.hrRole, 'org.edit', req.hrSettings)) { res.status(403).json({ error: 'You do not have access to this' }); return false; }
  return true;
};
// Forms send every field; only real changes count. '' and null match, and so do 18000 and "18000.00".
const sameValue = (a, b) => {
  const empty = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);
  if (empty(a) && empty(b)) return true;
  if (typeof a === 'object' || typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b);
  if (typeof a === 'boolean' || typeof b === 'boolean') return Boolean(a) === Boolean(b);
  if (a !== '' && b !== '' && !Number.isNaN(Number(a)) && !Number.isNaN(Number(b))) return Number(a) === Number(b);
  return String(a) === String(b);
};
const sendError = (res, err) => res.status(err.status || 500).json({ error: err.message });

const loadAll = async () => {
  const [companies, divisions, departments, teams, positions] = await Promise.all([
    M.HrCompany.findAll({ raw: true }), M.HrDivision.findAll({ raw: true }), M.HrDepartment.findAll({ raw: true }),
    M.HrTeam.findAll({ raw: true }), M.HrPosition.findAll({ raw: true }),
  ]);
  const { HrEmployee } = require('../models/hrEmployee');
  const employees = await HrEmployee.findAll({ where: { archived_at: null }, attributes: ['id', 'full_name', 'employee_code', 'status', 'company_id', 'division_id', 'department_id', 'team_id', 'position_id'], raw: true });
  return { companies, divisions, departments, teams, positions, employees };
};

/** Validation shared by create and update; returns an error message or null. */
const problem = async (L, data, id = null) => {
  if (L === LEVELS.positions && data.reports_to_position_id != null && id != null) {
    const loop = await reportingLoopMessage(id, data.reports_to_position_id);
    if (loop) return loop;
  }
  if (L.parent && data[L.parent] != null) {
    const parentLevel = { company_id: M.HrCompany, division_id: M.HrDivision, department_id: M.HrDepartment }[L.parent];
    const parent = await parentLevel.findByPk(data[L.parent]);
    if (!parent || !parent.is_active) return 'The parent it belongs to does not exist or is inactive';
  }
  return null;
};

exports.tree = asyncHandler(async (req, res) => {
  const f = only(req.query, ['divisionId', 'departmentId', 'branchId', 'positionId', 'managerId', 'employmentStatus']);
  res.json(org.buildOrgTree(await loadAll(), f));
});

exports.alerts = asyncHandler(async (req, res) => {
  const { departments, positions } = await loadAll();
  res.json(org.orgAlerts({ departments, positions }));
});

exports.list = asyncHandler(async (req, res) => {
  const L = levelOf(req, res);
  if (!L) return undefined;
  const { limit, offset, page } = getPagination(req);
  const where = {};
  if (req.query.active === 'true') where.is_active = true;
  if (req.query.active === 'false') where.is_active = false;
  ['company_id', 'division_id', 'department_id', 'team_id'].forEach((k) => { if (req.query[k] && L.fields.includes(k)) where[k] = req.query[k]; });
  const nameCol = L === LEVELS.positions ? 'title' : 'name';
  if (req.query.q) where[Op.or] = [{ [nameCol]: { [Op.like]: `%${req.query.q}%` } }, { code: { [Op.like]: `%${req.query.q}%` } }];
  // ?all=1 returns every row: the structure screens need the whole tree (M1 §13: up to 1,000 positions).
  const paging = req.query.all === '1' ? {} : { limit, offset };
  const { rows, count } = await L.model.findAndCountAll({ where, ...paging, order: [[nameCol, 'ASC']] });
  return res.json({ data: rows.map((r) => stripCost(req, L, plain(r))), total: count, page });
});

exports.get = asyncHandler(async (req, res) => {
  const L = levelOf(req, res);
  if (!L) return undefined;
  const row = await L.model.findByPk(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  return res.json(stripCost(req, L, plain(row)));
});

exports.create = asyncHandler(async (req, res) => {
  const L = levelOf(req, res);
  if (!L || !writeOnly(req, res)) return undefined;
  const data = only(req.body || {}, L.fields);
  const missing = L.required.filter((k) => data[k] == null || data[k] === '');
  if (missing.length) return res.status(400).json({ error: `Required: ${missing.join(', ')}` });
  const bad = await problem(L, data);
  if (bad) return res.status(400).json({ error: bad });
  try {
    if (L.createKind) {
      const cr = await raise(req, { kind: L.createKind, entity_type: L.entity, payload: data, reason: req.body.reason || null });
      return res.status(202).json({ change_request: plain(cr), message: 'Sent for approval' });
    }
    return res.status(201).json(await createEntity(req.params.level, data, req));
  } catch (err) { return sendError(res, err); }
});

exports.update = asyncHandler(async (req, res) => {
  const L = levelOf(req, res);
  if (!L || !writeOnly(req, res)) return undefined;
  const row = await L.model.findByPk(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const before = plain(row);
  const changes = Object.fromEntries(Object.entries(only(req.body || {}, L.fields))
    .filter(([k, v]) => !sameValue(v, before[k])));
  if (!Object.keys(changes).length) return res.json({ entity: before, change_requests: [] });
  const bad = await problem(L, { ...before, ...changes }, row.id);
  if (bad) return res.status(400).json({ error: bad });

  const governed = {};
  const direct = {};
  Object.entries(changes).forEach(([k, v]) => {
    const kind = (L.governed || {})[k];
    if (kind) (governed[kind] = governed[kind] || {})[k] = v; else direct[k] = v;
  });
  try {
    const requests = [];
    for (const [kind, payload] of Object.entries(governed)) {
      requests.push(plain(await raise(req, { kind, entity_type: L.entity, entity_id: row.id, payload, before: only(before, Object.keys(payload)), reason: req.body.reason || null })));
    }
    const entity = Object.keys(direct).length ? await updateEntity(req.params.level, row.id, direct, req) : before;
    return res.status(requests.length ? 202 : 200).json({ entity: stripCost(req, L, entity), change_requests: requests });
  } catch (err) { return sendError(res, err); }
});

exports.deactivate = asyncHandler(async (req, res) => {
  const L = levelOf(req, res);
  if (!L || !writeOnly(req, res)) return undefined;
  const row = await L.model.findByPk(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (!row.is_active) return res.status(400).json({ error: 'It is already inactive' });

  // Open vacancies join with recruitment (Task 16).
  const blockers = { activeEmployees: await activeEmployees(req.params.level, row.id), openVacancies: 0, activeChildren: await activeChildren(req.params.level, row.id) };
  const message = org.blockerMessage(L.entity.replace('_', ' '), blockers);
  if (message) return res.status(409).json({ error: message, blockers });

  try {
    if (L.deactivateKind) {
      const cr = await raise(req, { kind: L.deactivateKind, entity_type: L.entity, entity_id: row.id, payload: { is_active: false }, before: { is_active: true }, reason: req.body && req.body.reason });
      return res.status(202).json({ change_request: plain(cr), message: 'Sent for approval' });
    }
    return res.json(await updateEntity(req.params.level, row.id, { is_active: false }, req));
  } catch (err) { return sendError(res, err); }
});

// GET /api/hr/org/branches: office locations a department can sit in (M1 §4.3 "Location/Branch").
exports.branches = asyncHandler(async (req, res) => {
  const Branch = require('../models/Branch');
  res.json(await Branch.findAll({ attributes: ['id', 'name'], order: [['name', 'ASC']], raw: true }));
});
