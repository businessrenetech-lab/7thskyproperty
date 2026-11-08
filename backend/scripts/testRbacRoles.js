// Custom roles, role assignment and the server-side area check. Run: node scripts/testRbacRoles.js — silent on success.
const assert = require('assert');
const { AREAS, LEVELS, areaForRequest, proxyRolesFor } = require('../config/accessAreas');
const {
  isBuiltInRole, validateCustomRole, customRoleAllows, canAssignRole, canActOn, accessSummary,
} = require('../services/roleRank.service');
const { capabilitiesFor } = require('../middleware/wtRoles');
const { hrRoleOf } = require('../services/hrAccess.service');

// ── The catalogue ───────────────────────────────────────────────────────────
assert.deepStrictEqual(LEVELS.map((l) => l.key), ['sales', 'operations', 'finance', 'manage']);
const keys = AREAS.map((a) => a.key);
['crm', 'rentals', 'short_stay', 'sales', 'business', 'accounting', 'line:water_tank', 'line:air_conditioning', 'line:business_registration']
  .forEach((k) => assert.ok(keys.includes(k), `area ${k}`));
assert.ok(!keys.some((k) => /settings|rbac|auth/.test(k)), 'account and settings areas are never grantable');

// ── Which area a request is in ──────────────────────────────────────────────
const rq = (baseUrl, line) => ({ baseUrl, headers: line ? { 'x-service-line': line } : {} });
assert.strictEqual(areaForRequest(rq('/api/contacts')), 'crm');
assert.strictEqual(areaForRequest(rq('/api/sales/inbox')), 'sales');
assert.strictEqual(areaForRequest(rq('/api/sales-enquiries')), 'sales');
assert.strictEqual(areaForRequest(rq('/api/salesx')), null);                       // a prefix must end at a path boundary
assert.strictEqual(areaForRequest(rq('/api/tenancies')), 'rentals');
assert.strictEqual(areaForRequest(rq('/api/wt-work-orders')), 'line:water_tank');   // no header → the default line
assert.strictEqual(areaForRequest(rq('/api/wt-work-orders', 'air_conditioning')), 'line:air_conditioning');
assert.strictEqual(areaForRequest(rq('/api/wt-work-orders', 'made_up')), 'line:water_tank');   // same fallback the data scope uses
assert.strictEqual(areaForRequest(rq('/api/business-registration-projects')), 'line:business_registration');
assert.strictEqual(areaForRequest(rq('/api/business-listings')), 'business');
assert.strictEqual(areaForRequest(rq('/api/payroll')), 'accounting');
assert.strictEqual(areaForRequest(rq('/api/auth')), null);
assert.strictEqual(areaForRequest(rq('/api/rbac')), null);
assert.strictEqual(areaForRequest(rq('/api/settings')), null);
assert.strictEqual(areaForRequest(rq('/api/branches')), null);
assert.strictEqual(areaForRequest(rq('/api/dashboard')), 'common');

// ── Levels act as built-in roles inside their area only ─────────────────────
assert.deepStrictEqual(proxyRolesFor(['sales']), ['sales_executive']);
assert.ok(proxyRolesFor(['finance']).includes('accounts'));
assert.ok(proxyRolesFor(['operations']).includes('property_manager'));
assert.ok(proxyRolesFor(['manage']).includes('branch_admin'));
assert.ok(!proxyRolesFor(['manage', 'sales', 'operations', 'finance']).includes('super_admin'));

const role = Object.freeze({ key: 'site_lead', label: 'Site lead', hr_role: 'team_leader', areas: { 'line:water_tank': ['operations'], crm: ['sales'] } });
const OPS = ['super_admin', 'branch_admin', 'property_manager'];
assert.strictEqual(customRoleAllows(role, OPS, rq('/api/wt-work-orders')), true);
assert.strictEqual(customRoleAllows(role, OPS, rq('/api/wt-work-orders', 'air_conditioning')), false);   // another line
assert.strictEqual(customRoleAllows(role, ['super_admin', 'branch_admin', 'accounts'], rq('/api/wt-invoices')), false); // no finance
assert.strictEqual(customRoleAllows(role, OPS, rq('/api/contacts')), false);                // sales only in CRM
assert.strictEqual(customRoleAllows(role, ['super_admin', 'sales_executive'], rq('/api/contacts')), true);
assert.strictEqual(customRoleAllows(role, ['super_admin', 'branch_admin'], rq('/api/auth')), false);
assert.strictEqual(customRoleAllows(role, ['super_admin'], rq('/api/wt-work-orders')), false);
// Shared screens (dashboard, notifications) open at the levels held anywhere, never at manage.
assert.strictEqual(customRoleAllows(role, OPS, rq('/api/dashboard')), true);
const mgr = { key: 'line_head', areas: { 'line:water_tank': ['manage'] } };
assert.strictEqual(customRoleAllows(mgr, ['super_admin', 'branch_admin'], rq('/api/wt-work-orders')), true);
assert.strictEqual(customRoleAllows(mgr, ['super_admin', 'branch_admin'], rq('/api/dashboard')), false);
assert.strictEqual(customRoleAllows(null, OPS, rq('/api/wt-work-orders')), false);

// ── Water Tank capabilities follow the same levels ──────────────────────────
assert.strictEqual(capabilitiesFor(['site_lead', 'property_manager']).operate, true);
assert.strictEqual(capabilitiesFor(['site_lead', 'property_manager']).transact, false);
assert.strictEqual(capabilitiesFor('accounts').transact, true);

// ── HR role of a custom role ────────────────────────────────────────────────
assert.strictEqual(hrRoleOf({ role: 'site_lead', customRole: role }), 'team_leader');
assert.strictEqual(hrRoleOf({ role: 'site_lead', customRole: { key: 'x', hr_role: 'ceo' } }), 'employee');   // never CEO
assert.strictEqual(hrRoleOf({ role: 'site_lead' }), 'employee');

// ── Validating a role ───────────────────────────────────────────────────────
const ok = validateCustomRole({ label: 'Site lead', color: '#0EA5A4', areas: { 'line:water_tank': ['manage'], nope: ['sales'], crm: ['sales', 'bogus'] } }, []);
assert.strictEqual(ok.error, undefined);
assert.strictEqual(ok.role.key, 'site_lead');                                   // key made from the label
assert.deepStrictEqual(ok.role.areas['line:water_tank'], ['sales', 'operations', 'finance', 'manage']);   // manage includes the rest
assert.deepStrictEqual(ok.role.areas.crm, ['sales']);
assert.ok(!('nope' in ok.role.areas));
assert.strictEqual(ok.role.hr_role, 'employee');
assert.match(validateCustomRole({ label: '' }, []).error, /name/i);
assert.match(validateCustomRole({ label: 'Accounts' }, []).error, /built-in/i);
assert.match(validateCustomRole({ label: 'Super admin' }, []).error, /built-in/i);
assert.match(validateCustomRole({ label: 'Site lead' }, ['site_lead']).error, /already/i);
assert.match(validateCustomRole({ label: 'Site lead', color: 'red' }, []).error, /colour/i);
assert.match(validateCustomRole({ label: 'Site lead', hr_role: 'ceo' }, []).error, /HR/);
assert.match(validateCustomRole({ label: 'x'.repeat(61) }, []).error, /60/);
assert.strictEqual(validateCustomRole({ label: 'Site lead', key: 'site_lead' }, ['site_lead'], { editing: 'site_lead' }).error, undefined);

assert.strictEqual(isBuiltInRole('accounts'), true);
assert.strictEqual(isBuiltInRole('tenant'), true);
assert.strictEqual(isBuiltInRole('site_lead'), false);

// ── Who may give which role ─────────────────────────────────────────────────
const custom = ['site_lead'];
const sa = { id: 1, role: 'super_admin' };
const ba = { id: 2, role: 'branch_admin' };
const pm = { id: 3, role: 'property_manager' };
const cr = { id: 4, role: 'site_lead' };
assert.strictEqual(canAssignRole(sa, 'site_lead', custom), true);
assert.strictEqual(canAssignRole(sa, 'branch_admin', custom), true);
assert.strictEqual(canAssignRole(sa, 'made_up', custom), false);
assert.strictEqual(canAssignRole(ba, 'accounts', custom), true);
assert.strictEqual(canAssignRole(ba, 'branch_admin', custom), false);
assert.strictEqual(canAssignRole(ba, 'site_lead', custom), false);              // custom roles: super admin only
assert.strictEqual(canAssignRole(cr, 'staff', custom), false);
assert.strictEqual(canAssignRole(pm, 'staff', custom), false);

// ── Who may act on whose account ────────────────────────────────────────────
assert.strictEqual(canActOn(sa, sa, custom), false);                             // never your own account here
assert.strictEqual(canActOn(sa, { id: 9, role: 'super_admin' }, custom), true);
assert.strictEqual(canActOn(sa, cr, custom), true);
assert.strictEqual(canActOn(ba, { id: 9, role: 'super_admin' }, custom), false);
assert.strictEqual(canActOn(ba, { id: 9, role: 'branch_admin' }, custom), false);
assert.strictEqual(canActOn(ba, pm, custom), true);
assert.strictEqual(canActOn(ba, cr, custom), false);
assert.strictEqual(canActOn(ba, { id: 9, role: 'tenant' }, custom), false);      // customer accounts are not staff
assert.strictEqual(canActOn(pm, { id: 9, role: 'staff' }, custom), false);

// ── What /auth/me tells the menus ───────────────────────────────────────────
assert.strictEqual(accessSummary({ role: 'accounts' }), null);
const sum = accessSummary({ role: 'site_lead', customRole: role });
assert.strictEqual(sum.custom, true);
assert.strictEqual(sum.label, 'Site lead');
assert.deepStrictEqual(sum.areas.crm, ['sales']);
assert.deepStrictEqual(sum.proxies.crm, ['sales_executive']);
assert.deepStrictEqual(accessSummary({ role: 'gone_role' }), { custom: true, key: 'gone_role', label: 'gone_role', areas: {}, proxies: {}, missing: true });

// HR logins (hrEmployeeStore.LOGIN_ROLES) are built-in roles, not custom ones.
const { LOGIN_ROLES } = require('../services/hrEmployeeStore');
LOGIN_ROLES.forEach((r) => assert.strictEqual(isBuiltInRole(r), true, `${r} is built in`));
assert.strictEqual(accessSummary({ role: 'employee' }), null);
assert.match(validateCustomRole({ label: 'Employee' }, []).error, /built-in/i);
// …and appear in Users and roles, so an admin can reset an employee's password or role.
const { STAFF_ROLES } = require('../services/roleRank.service');
LOGIN_ROLES.forEach((r) => assert.ok(STAFF_ROLES.includes(r), `${r} listed`));
assert.strictEqual(canAssignRole(sa, 'employee', custom), true);
assert.strictEqual(canAssignRole(ba, 'employee', custom), true);
assert.strictEqual(canAssignRole(ba, 'hr_manager', custom), false);           // HR access levels: super admin only
assert.strictEqual(canActOn(ba, { id: 9, role: 'employee' }, custom), true);
assert.strictEqual(canActOn(ba, { id: 9, role: 'hr_manager' }, custom), false);
