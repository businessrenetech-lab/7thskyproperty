/**
 * HR "Roles & access" (plan Task 4): read and change who may see and do what in HR. The client's tables are
 * the defaults; the CEO's changes are stored in hr_access_settings, logged in hr_history, and enforced by the
 * hrRole() route guard everywhere in HR.
 */
const { asyncHandler } = require('../utils/controllerHelpers');
const { HrAccessSettings } = require('../models/hrOrganisation');
const { HrHistory } = require('../models/hrChange');
const access = require('../services/hrAccess.service');

const describe = (settings) => ({
  roles: access.HR_ROLES.map((r) => ({ key: r, label: access.ROLE_LABELS[r] })),
  actions: access.ACTIONS,
  locked: { ceo: access.CEO_LOCKED },
  matrix: settings.matrix,
  defaults: access.DEFAULT_MATRIX,
  yourRole: null,
});

exports.get = asyncHandler(async (req, res) => {
  res.json({ ...describe(await access.loadSettings()), yourRole: req.hrRole });
});

const save = async (req, given) => {
  const matrix = { ...given, _known: access.ACTIONS };   // these settings decide every action that exists now
  const before = (await access.loadSettings()).matrix;
  const row = await HrAccessSettings.findOne({ order: [['id', 'DESC']] });
  if (row) await row.update({ matrix, updated_by: req.user.id });
  else await HrAccessSettings.create({ matrix, updated_by: req.user.id });
  access.clearSettingsCache();
  const after = (await access.loadSettings()).matrix;
  const changed = access.HR_ROLES.filter((r) => JSON.stringify([...before[r]].sort()) !== JSON.stringify([...after[r]].sort()));
  await Promise.all(changed.map((r) => HrHistory.create({
    branch_id: req.user.branch_id || null, entity_type: 'access_settings', entity_id: 1, field: r,
    old_value: before[r].join(','), new_value: after[r].join(','), actor_id: req.user.id, at: new Date(),
  })));
  return after;
};

exports.update = asyncHandler(async (req, res) => {
  const matrix = req.body && req.body.matrix;
  const check = access.validateSettings({ matrix });
  if (!check.ok) return res.status(400).json({ error: check.error });
  const after = await save(req, matrix);
  return res.json({ ...describe({ matrix: after }), yourRole: req.hrRole });
});

exports.reset = asyncHandler(async (req, res) => {
  const after = await save(req, access.DEFAULT_MATRIX);
  res.json({ ...describe({ matrix: after }), yourRole: req.hrRole });
});

// GET /api/hr/access/me: what the signed-in person may do in HR, so the console shows only what works.
exports.me = asyncHandler(async (req, res) => {
  const settings = await access.loadSettings();
  const ctx = await access.loadContext(req.user);
  const role = access.hrRoleOf(req.user, ctx);
  res.json({ role, role_label: role ? access.ROLE_LABELS[role] : null, employee_code: ctx.employee ? ctx.employee.employee_code : null, can: Object.fromEntries(access.ACTIONS.map((a) => [a, access.can(role, a, settings)])) });
});
