/**
 * roleRank.service.js — custom roles, and who may give which role or act on whose account.
 * Ported from Hadi Real Estate (services/roleRank.service.js) and adapted to this app's roles.
 *
 * canAssignRole(actor, role, customKeys)
 *   super_admin      any assignable built-in role, and any custom role
 *   branch_admin     staff-level roles (BRANCH_ADMIN_ROLES) only; never a custom role, which could carry
 *                    areas the branch admin cannot use themselves
 *   anyone else      nothing
 *
 * canActOn(actor, target, customKeys)   (role, password, status)
 *   nobody acts on their own account here (own password: POST /auth/change-password)
 *   super_admin      anyone else
 *   branch_admin     accounts whose current role it could have given
 *   anyone else      nobody
 *
 * A custom role is stored in rbac_configs.custom_roles_json as
 *   { key, label, color, description, hr_role, areas: { [areaKey]: [level, …] } }
 * and is checked by roleMiddleware through customRoleAllows (config/accessAreas.js explains the levels).
 */
const { AREAS, LEVEL_KEYS, areaForRequest, proxyRolesFor } = require('../config/accessAreas');

const HR_LOGIN_ROLES = ['employee', 'hr_officer', 'hr_manager', 'finance_manager', 'it_admin'];   // hrEmployeeStore.LOGIN_ROLES
const ASSIGNABLE_ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts', 'owner', 'tenant', 'buyer', 'supplier', 'staff', 'unassigned', ...HR_LOGIN_ROLES];
const BRANCH_ADMIN_ROLES = ['property_manager', 'sales_executive', 'accounts', 'staff', 'unassigned', 'employee'];
// The staff roles the Users & roles screen offers; customer roles get their accounts from their own flows.
const STAFF_ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts', 'staff', 'unassigned', ...HR_LOGIN_ROLES];
const ROLE_LABELS = {
  super_admin: 'Super admin', branch_admin: 'Branch admin', property_manager: 'Property manager', sales_executive: 'Sales executive',
  accounts: 'Accounts', staff: 'Staff', unassigned: 'Unassigned', employee: 'Employee', hr_officer: 'HR officer', hr_manager: 'HR manager',
  finance_manager: 'Finance manager', it_admin: 'IT admin', owner: 'Owner', tenant: 'Tenant', buyer: 'Buyer', supplier: 'Supplier',
};
const ROLE_NOTES = {
  super_admin: 'Everything, in every branch. Manages roles and every account.',
  branch_admin: 'Everything in their branch. Manages staff accounts there.',
  property_manager: 'Runs properties, tenancies, service work and agreements.',
  sales_executive: 'Enquiries, clients, quotes and sales.',
  accounts: 'Invoices, receipts, payments and accounting.',
  staff: 'Signs in for HR self-service only.',
  unassigned: 'Can sign in but sees nothing until given a role.',
  employee: 'HR self-service: their own profile, leave and attendance.',
  hr_officer: 'Runs HR records, recruitment, attendance and leave.',
  hr_manager: 'All of HR, and approves HR changes.',
  finance_manager: 'Payroll and bank details in HR; approves pay changes.',
  it_admin: 'Sees employee records (no pay) to set up logins and devices.',
};

// Every key the code gives a meaning to: a custom role may never use one of these.
const BUILT_IN_ROLE_KEYS = new Set([
  ...ASSIGNABLE_ROLES,
  'operations', 'coordinator', 'technician', 'hr', 'hr_manager', 'hr_staff', 'hrm', 'accounting', 'counselor', 'crm', 'trainer', 'teacher',
  'wt_client', 'wt_provider', 'client', 'guardian', 'customer', 'seller', 'student', 'landlord', 'admin', 'director', 'ceo',
  // HR logins (hrEmployeeStore.LOGIN_ROLES) and the other HR access levels.
  'employee', 'hr_officer', 'finance_manager', 'it_admin', 'department_manager', 'team_leader',
]);
const isBuiltInRole = (key) => BUILT_IN_ROLE_KEYS.has(String(key || '').trim().toLowerCase());

const HR_ROLE_CHOICES = ['employee', 'team_leader', 'department_manager', 'hr_officer', 'hr_manager', 'finance_manager', 'it_admin'];
const AREA_KEYS = AREAS.map((a) => a.key);
const slug = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

/**
 * Check and tidy one custom role. `takenKeys` are the keys already saved; `editing` is the key being edited.
 * Returns { role } or { error }. Unknown areas and levels are dropped; 'manage' brings every level with it.
 */
function validateCustomRole(input, takenKeys = [], { editing = null } = {}) {
  const label = String(input?.label || '').trim();
  if (!label) return { error: 'Give the role a name.' };
  if (label.length > 60) return { error: 'The name can be at most 60 characters.' };
  const key = editing || slug(input.key || label);
  if (!/^[a-z0-9_]{2,40}$/.test(key)) return { error: 'The name needs at least two letters or numbers.' };
  if (isBuiltInRole(key) || isBuiltInRole(slug(label))) return { error: `"${label}" is a built-in role. Choose another name.` };
  if (!editing && takenKeys.includes(key)) return { error: `A role called "${label}" already exists.` };
  const color = input.color == null || input.color === '' ? '#475569' : String(input.color);
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return { error: 'The colour must look like #1E3A8A.' };
  const description = String(input.description || '').trim();
  if (description.length > 200) return { error: 'The description can be at most 200 characters.' };
  const hrRole = input.hr_role || 'employee';
  if (!HR_ROLE_CHOICES.includes(hrRole)) return { error: 'Choose an HR access level from the list (the CEO level cannot be given to a custom role).' };
  const areas = {};
  Object.entries(input.areas && typeof input.areas === 'object' ? input.areas : {}).forEach(([area, levels]) => {
    if (!AREA_KEYS.includes(area) || !Array.isArray(levels)) return;
    const picked = levels.includes('manage') ? LEVEL_KEYS.slice() : LEVEL_KEYS.filter((l) => levels.includes(l));
    if (picked.length) areas[area] = picked;
  });
  return { role: { key, label, color, description, hr_role: hrRole, areas } };
}

/** May this custom role pass a guard that lets `allowedRoles` through, on this request? */
function customRoleAllows(customRole, allowedRoles, req) {
  if (!customRole || !customRole.areas) return false;
  const area = areaForRequest(req);
  if (!area) return false;
  let proxies;
  if (area === 'common') {
    const held = new Set(Object.values(customRole.areas).flat().filter((l) => l !== 'manage'));
    proxies = proxyRolesFor([...held]);
  } else {
    proxies = proxyRolesFor(customRole.areas[area]);
  }
  return proxies.some((r) => allowedRoles.includes(r));
}

/** The roles this user counts as on this request: their own, plus a custom role's stand-ins for the area. */
function effectiveRoles(user, req) {
  const own = user?.role ? [user.role] : [];
  if (!user?.customRole) return own;
  const area = areaForRequest(req);
  return [...own, ...(area && area !== 'common' ? proxyRolesFor(user.customRole.areas?.[area]) : [])];
}

function canAssignRole(actor, role, customKeys = []) {
  if (!actor) return false;
  if (!ASSIGNABLE_ROLES.includes(role) && !customKeys.includes(role)) return false;
  if (actor.role === 'super_admin') return true;
  if (actor.role === 'branch_admin') return BRANCH_ADMIN_ROLES.includes(role);
  return false;
}

function canActOn(actor, target, customKeys = []) {
  if (!actor || !target) return false;
  if (Number(actor.id) === Number(target.id)) return false;
  if (actor.role === 'super_admin') return true;
  if (actor.role === 'branch_admin') return BRANCH_ADMIN_ROLES.includes(target.role);
  return false;
}

/** What /auth/me tells the menus: null for a built-in role. */
function accessSummary(user) {
  if (!user || isBuiltInRole(user.role)) return null;
  const c = user.customRole;
  // A role that was deleted or never existed: signs in, sees nothing.
  if (!c) return { custom: true, key: user.role, label: user.role, areas: {}, proxies: {}, missing: true };
  const proxies = {};
  Object.entries(c.areas || {}).forEach(([a, levels]) => { proxies[a] = proxyRolesFor(levels); });
  return { custom: true, key: c.key, label: c.label, color: c.color, hr_role: c.hr_role, areas: c.areas || {}, proxies };
}

// ── Stored roles (rbac_configs.custom_roles_json), cached for a few seconds per process ──
const sanitizeStored = (r) => {
  const v = validateCustomRole({
    ...r, label: r.label || r.key,
    hr_role: HR_ROLE_CHOICES.includes(r.hr_role) ? r.hr_role : 'employee',
    color: /^#[0-9a-fA-F]{6}$/.test(r.color || '') ? r.color : null,
  }, [], { editing: r.key });
  return Object.freeze(v.role || { key: r.key, label: r.label || r.key, color: '#475569', description: '', hr_role: 'employee', areas: {} });
};
let cache = null;
async function loadCustomRoles() {
  if (cache && cache.at > Date.now() - 5000) return cache.roles;
  const RbacConfig = require('../models/RbacConfig');
  const row = await RbacConfig.findOne({ order: [['id', 'DESC']] });
  const list = Array.isArray(row?.custom_roles_json) ? row.custom_roles_json : [];
  // Older saves (the Language Academy matrix) kept roles without areas: they keep their name and get no areas.
  const roles = list.filter((r) => r && typeof r.key === 'string' && !isBuiltInRole(r.key)).map(sanitizeStored);
  cache = { at: Date.now(), roles };
  return roles;
}
const clearCustomRoleCache = () => { cache = null; };
async function customRoleOf(roleKey) {
  if (!roleKey || isBuiltInRole(roleKey)) return null;
  return (await loadCustomRoles()).find((r) => r.key === roleKey) || null;
}
async function customRoleKeys() { return (await loadCustomRoles()).map((r) => r.key); }

module.exports = {
  ASSIGNABLE_ROLES, BRANCH_ADMIN_ROLES, STAFF_ROLES, ROLE_LABELS, ROLE_NOTES, BUILT_IN_ROLE_KEYS, HR_ROLE_CHOICES,
  isBuiltInRole, validateCustomRole, customRoleAllows, effectiveRoles, canAssignRole, canActOn, accessSummary,
  loadCustomRoles, clearCustomRoleCache, customRoleOf, customRoleKeys,
};
