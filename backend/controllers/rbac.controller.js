const RbacConfig = require('../models/RbacConfig');

/**
 * GET /api/rbac/config
 * Returns the current RBAC permission matrix.
 * Any authenticated user can read (they need it to build their sidebar).
 */
exports.getConfig = async (req, res) => {
  try {
    let config = await RbacConfig.findOne({ order: [['id', 'DESC']] });
    if (!config) {
      // No config saved yet — return empty so the frontend falls back to defaults
      return res.json({ permissions: null, customRoles: [] });
    }
    res.json({
      permissions: config.config_json,
      customRoles: config.custom_roles_json,
    });
  } catch (error) {
    console.error('RBAC getConfig error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/rbac/config
 * Saves the full RBAC permission matrix.
 * Only super_admin / branch_admin should call this (enforced by middleware).
 */
exports.saveConfig = async (req, res) => {
  try {
    const { permissions, customRoles } = req.body;
    if (!permissions) {
      return res.status(400).json({ error: 'permissions object is required' });
    }

    // Upsert — always overwrite the single config row. Custom roles are kept: they are managed through
    // /api/rbac/roles, and an old matrix screen saving its copy must not wipe them.
    let config = await RbacConfig.findOne({ order: [['id', 'DESC']] });
    if (config) {
      config.config_json = permissions;
      config.updated_by = req.user?.id || null;
      await config.save();
    } else {
      config = await RbacConfig.create({
        config_json: permissions,
        custom_roles_json: customRoles || [],
        updated_by: req.user?.id || null,
      });
    }

    res.json({ message: 'RBAC configuration saved successfully.', id: config.id });
  } catch (error) {
    console.error('RBAC saveConfig error:', error);
    res.status(500).json({ error: error.message });
  }
};

/* ────────────────────────────────────────────────────────────────────────────
 * Users & roles (custom roles). Rules: services/roleRank.service.js; areas and levels: config/accessAreas.js.
 * ──────────────────────────────────────────────────────────────────────────── */
const { Op } = require('sequelize');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { asyncHandler } = require('../utils/controllerHelpers');
const roleRank = require('../services/roleRank.service');
const { AREAS, LEVELS } = require('../config/accessAreas');
const { ROLE_LABELS: HR_LABELS } = require('../services/hrAccess.service');

async function saveRoles(roles, userId) {
  let config = await RbacConfig.findOne({ order: [['id', 'DESC']] });
  if (config) {
    // Entries for built-in roles (written by the old Language Academy matrix) are not custom roles: keep them.
    const legacy = (Array.isArray(config.custom_roles_json) ? config.custom_roles_json : []).filter((r) => r && roleRank.isBuiltInRole(r.key));
    config.custom_roles_json = [...legacy, ...roles];
    config.updated_by = userId;
    await config.save();
  } else {
    await RbacConfig.create({ config_json: {}, custom_roles_json: roles, updated_by: userId });
  }
  roleRank.clearCustomRoleCache();
}

async function usage(keys) {
  if (!keys.length) return {};
  const rows = await User.findAll({ where: { role: { [Op.in]: keys } }, attributes: ['role', [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'n']], group: ['role'], raw: true });
  return Object.fromEntries(rows.map((r) => [r.role, Number(r.n)]));
}

const audit = (req, action, oldValue, newValue) => AuditLog.create({
  user_id: req.user.id, branch_id: req.user.branch_id, action, entity: 'custom_roles', entity_id: null, old_value: oldValue, new_value: newValue, ip_address: req.ip,
}).catch((e) => console.warn('[rbac] audit:', e.message));

/** GET /api/rbac/catalog — areas, levels, HR levels, built-in roles, and the roles this admin may give. */
exports.catalog = asyncHandler(async (req, res) => {
  const custom = await roleRank.loadCustomRoles();
  const keys = custom.map((r) => r.key);
  const builtIn = roleRank.STAFF_ROLES.map((k) => ({ key: k, label: roleRank.ROLE_LABELS[k], note: roleRank.ROLE_NOTES[k] }));
  res.json({
    areas: AREAS.map(({ key, label, group }) => ({ key, label, group })),
    levels: LEVELS.map(({ key, label, hint }) => ({ key, label, hint })),
    hrRoles: roleRank.HR_ROLE_CHOICES.map((k) => ({ key: k, label: HR_LABELS[k] })),
    builtIn,
    assignable: [...builtIn, ...custom.map((r) => ({ key: r.key, label: r.label, custom: true }))]
      .filter((r) => roleRank.canAssignRole(req.user, r.key, keys)).map((r) => r.key),
    canManageRoles: req.user.role === 'super_admin',
  });
});

/** GET /api/rbac/roles — custom roles with how many people hold each. */
exports.listRoles = asyncHandler(async (req, res) => {
  const roles = await roleRank.loadCustomRoles();
  const counts = await usage(roles.map((r) => r.key));
  res.json({ data: roles.map((r) => ({ ...r, users: counts[r.key] || 0 })) });
});

/** POST /api/rbac/roles — super admin only. */
exports.createRole = asyncHandler(async (req, res) => {
  const roles = (await roleRank.loadCustomRoles()).slice();
  if (roles.length >= 50) return res.status(400).json({ error: 'There can be at most 50 custom roles.' });
  const v = roleRank.validateCustomRole(req.body, roles.map((r) => r.key));
  if (v.error) return res.status(400).json({ error: v.error });
  // A key some account already uses (an old role name) would hand those people this role's access.
  if (await User.count({ where: { role: v.role.key } })) return res.status(409).json({ error: `Some accounts already have the role key "${v.role.key}". Choose another name.` });
  await saveRoles([...roles, v.role], req.user.id);
  audit(req, 'CREATE_CUSTOM_ROLE', null, v.role);
  res.status(201).json({ data: { ...v.role, users: 0 } });
});

/** PUT /api/rbac/roles/:key — super admin only. The key never changes, so holders keep the role. */
exports.updateRole = asyncHandler(async (req, res) => {
  const roles = (await roleRank.loadCustomRoles()).slice();
  const i = roles.findIndex((r) => r.key === req.params.key);
  if (i < 0) return res.status(404).json({ error: 'No such role.' });
  const v = roleRank.validateCustomRole(req.body, roles.map((r) => r.key), { editing: req.params.key });
  if (v.error) return res.status(400).json({ error: v.error });
  const before = roles[i];
  roles[i] = v.role;
  await saveRoles(roles, req.user.id);
  audit(req, 'UPDATE_CUSTOM_ROLE', before, v.role);
  res.json({ data: { ...v.role, users: (await usage([v.role.key]))[v.role.key] || 0 } });
});

/** DELETE /api/rbac/roles/:key — super admin only; refused while anyone still holds the role. */
exports.deleteRole = asyncHandler(async (req, res) => {
  const roles = await roleRank.loadCustomRoles();
  const role = roles.find((r) => r.key === req.params.key);
  if (!role) return res.status(404).json({ error: 'No such role.' });
  const n = await User.count({ where: { role: role.key } });
  if (n) return res.status(409).json({ error: `${n} ${n === 1 ? 'person still has' : 'people still have'} the role ${role.label}. Move them to another role first.` });
  await saveRoles(roles.filter((r) => r.key !== role.key), req.user.id);
  audit(req, 'DELETE_CUSTOM_ROLE', role, null);
  res.json({ message: `Deleted ${role.label}.` });
});
