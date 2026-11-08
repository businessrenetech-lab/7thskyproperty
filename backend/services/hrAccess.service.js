/**
 * HR access control (plan Task 4). The client's tables (M1 §7, M2 §10) are the defaults; the CEO can change
 * them on the "Roles & access" screen (stored in hr_access_settings). The server always checks the stored
 * settings, and every employee record leaves the API through maskEmployee().
 *
 * Payroll fields are shown only with `emp.view_payroll`, sensitive fields only with `emp.view_sensitive`
 * (M2 §3.4, §10). Employees always see their own record in full.
 */
const { NON_STAFF } = require('../utils/hrRoles');

const HR_ROLES = ['ceo', 'hr_manager', 'hr_officer', 'finance_manager', 'department_manager', 'team_leader', 'employee', 'it_admin'];
const ROLE_LABELS = {
  ceo: 'CEO', hr_manager: 'HR Manager', hr_officer: 'HR Officer', finance_manager: 'Finance Manager',
  department_manager: 'Department Manager', team_leader: 'Team Leader', employee: 'Employee', it_admin: 'IT Admin',
};
const ACTIONS = [
  'org.view_basic', 'org.edit', 'org.view_cost',
  'emp.view_any', 'emp.view_team', 'emp.view_own', 'emp.edit', 'emp.view_payroll', 'emp.view_sensitive',
  'rec.manage', 'rec.request', 'approvals.inbox',
  'time.view_all', 'time.manage', 'biometric.manage',
  'access.manage',
  'pay.manage', 'pay.view', 'pay.pay', 'perf.manage', 'off.manage',
];
/** The actions that existed before Phase 4. Settings saved without `_known` decided only these. */
const LEGACY_ACTIONS = ACTIONS.slice(0, ACTIONS.indexOf('pay.manage'));

const DEFAULT_MATRIX = {
  ceo: [...ACTIONS],                                                                  // full access
  hr_manager: ACTIONS.filter((a) => a !== 'access.manage'),                          // full employee access
  hr_officer: ['org.view_basic', 'org.edit', 'emp.view_any', 'emp.view_own', 'emp.edit', 'emp.view_sensitive', 'rec.manage', 'approvals.inbox', 'time.view_all', 'time.manage', 'biometric.manage',
    'pay.manage', 'pay.view', 'perf.manage', 'off.manage'],
  finance_manager: ['org.view_basic', 'org.view_cost', 'emp.view_any', 'emp.view_own', 'emp.view_payroll', 'approvals.inbox', 'time.view_all', 'pay.view', 'pay.pay'],   // payroll and bank only
  department_manager: ['org.view_basic', 'emp.view_team', 'emp.view_own', 'rec.request', 'approvals.inbox'],   // own department
  team_leader: ['org.view_basic', 'emp.view_team', 'emp.view_own'],                  // limited team details
  employee: ['org.view_basic', 'emp.view_own'],                                       // own profile, basic org chart
  it_admin: ['org.view_basic', 'emp.view_any', 'emp.view_own', 'biometric.manage'],  // technical, no salary
};

// Actions the CEO can never lose, so nobody can lock HR out.
const CEO_LOCKED = ['approvals.inbox', 'org.edit', 'access.manage'];

const PAYROLL_FIELDS = ['basic_salary', 'allowances', 'commission_eligible', 'bonus_eligible', 'overtime_eligible', 'bank_name',
  'bank_account_no', 'bank_branch', 'mobile_banking_no', 'tax_status', 'provident_fund_eligible', 'loan_balance', 'deduction_rules', 'base_salary', 'account_no'];
const SENSITIVE_FIELDS = ['national_id', 'passport_no', 'tin', 'medical_notes', 'disciplinary_notes', 'father_name', 'mother_name',
  'spouse_name', 'children', 'family_details', 'nid_number', 'religion'];

/** Stored settings over the defaults. A role present in the stored matrix replaces that role's defaults. */
const mergeSettings = (stored) => {
  const m = stored && typeof stored.matrix === 'object' && stored.matrix ? stored.matrix : {};
  // Actions added after these settings were saved were never decided: they take their defaults.
  const known = Array.isArray(m._known) ? m._known : LEGACY_ACTIONS;
  const undecided = ACTIONS.filter((a) => !known.includes(a));
  const matrix = {};
  HR_ROLES.forEach((r) => {
    matrix[r] = Array.isArray(m[r])
      ? [...m[r].filter((a) => ACTIONS.includes(a)), ...DEFAULT_MATRIX[r].filter((a) => undecided.includes(a) && !m[r].includes(a))]
      : DEFAULT_MATRIX[r];
  });
  CEO_LOCKED.forEach((a) => { if (!matrix.ceo.includes(a)) matrix.ceo = [...matrix.ceo, a]; });
  return { matrix };
};
const DEFAULTS = mergeSettings(null);

const validateSettings = (settings) => {
  const m = settings && settings.matrix;
  if (!m || typeof m !== 'object') return { ok: false, error: 'Settings need a matrix of roles and actions' };
  for (const [role, actions] of Object.entries(m)) {
    if (role === '_known') continue;
    if (!HR_ROLES.includes(role)) return { ok: false, error: `Unknown role: ${role}` };
    if (!Array.isArray(actions)) return { ok: false, error: `${ROLE_LABELS[role]}: actions must be a list` };
    const bad = actions.find((a) => !ACTIONS.includes(a));
    if (bad) return { ok: false, error: `Unknown action: ${bad}` };
  }
  if (m.ceo) {
    const missing = CEO_LOCKED.filter((a) => !m.ceo.includes(a));
    if (missing.length) return { ok: false, error: `The CEO must keep: ${missing.join(', ')}` };
  }
  return { ok: true };
};

const can = (hrRole, action, settings = DEFAULTS) => Boolean(hrRole && (settings.matrix[hrRole] || []).includes(action));

/**
 * The person's HR role. users.role holds ceo/hr_manager/hr_officer/finance_manager/it_admin (and older names);
 * other staff are employees, or department managers / team leaders when the org structure names them.
 * Clients (owners, tenants, …) get null: no HR access.
 */
const ROLE_MAP = {
  super_admin: 'ceo', ceo: 'ceo',
  hr_manager: 'hr_manager',
  hr_officer: 'hr_officer', hr: 'hr_officer', hr_staff: 'hr_officer', branch_admin: 'hr_officer',
  finance_manager: 'finance_manager', accounts: 'finance_manager',
  it_admin: 'it_admin',
};
const hrRoleOf = (user, ctx = {}) => {
  if (!user || !user.role || NON_STAFF.includes(user.role)) return null;
  if (ROLE_MAP[user.role]) return ROLE_MAP[user.role];
  // A custom role carries the HR level it was given (never CEO); org position still decides beyond that.
  const given = user.customRole?.hr_role;
  if (given && given !== 'employee' && given !== 'ceo' && HR_ROLES.includes(given)) return given;
  if (ctx.managesDepartment || ctx.headsDivision) return 'department_manager';
  if (ctx.leadsTeam || ctx.supervises) return 'team_leader';
  return 'employee';
};

/** The employee record as this viewer may see it, or null when they may not see it at all. */
const maskEmployee = (employee, viewer, settings = DEFAULTS) => {
  if (!employee || !viewer) return null;
  const own = viewer.employeeId != null && Number(viewer.employeeId) === Number(employee.id);
  if (own && can(viewer.hrRole, 'emp.view_own', settings)) return { ...employee };
  const inTeam = (viewer.teamIds || []).map(Number).includes(Number(employee.id));
  if (!can(viewer.hrRole, 'emp.view_any', settings) && !(inTeam && can(viewer.hrRole, 'emp.view_team', settings))) return null;
  const out = { ...employee };
  if (!can(viewer.hrRole, 'emp.view_payroll', settings)) PAYROLL_FIELDS.forEach((f) => { delete out[f]; });
  if (!can(viewer.hrRole, 'emp.view_sensitive', settings)) SENSITIVE_FIELDS.forEach((f) => { delete out[f]; });
  return out;
};

/* ── stored settings (database) ─────────────────────────────── */
let cache = null;
let cachedAt = 0;
const loadSettings = async () => {
  if (cache && Date.now() - cachedAt < 60000) return cache;
  const { HrAccessSettings } = require('../models/hrOrganisation');
  const row = await HrAccessSettings.findOne({ order: [['id', 'DESC']] });
  cache = mergeSettings(row ? { matrix: row.matrix } : null);
  cachedAt = Date.now();
  return cache;
};
const clearSettingsCache = () => { cache = null; };

/**
 * Who the signed-in person is in HR: their employee record (if any) and whether the structure makes them a
 * department manager, division head, team leader or supervisor.
 */
const loadContext = async (user) => {
  if (!user) return {};
  const { HrEmployee } = require('../models/hrEmployee');
  const Org = require('../models/hrOrganisation');
  const employee = await HrEmployee.findOne({ where: { user_id: user.id, archived_at: null }, attributes: ['id', 'department_id', 'division_id', 'team_id', 'status', 'employee_code'], raw: true });
  if (!employee) return { employee: null };
  const [deps, divs, teams, reports] = await Promise.all([
    Org.HrDepartment.count({ where: { manager_employee_id: employee.id, is_active: true } }),
    Org.HrDivision.count({ where: { head_employee_id: employee.id, is_active: true } }),
    Org.HrTeam.count({ where: { leader_employee_id: employee.id, is_active: true } }),
    HrEmployee.count({ where: { supervisor_employee_id: employee.id, archived_at: null } }),
  ]);
  return { employee, managesDepartment: deps > 0, headsDivision: divs > 0, leadsTeam: teams > 0, supervises: reports > 0 };
};

/**
 * Route guard: lets the request through when the user's HR role has ANY of the actions. Sets req.hrRole,
 * req.hrSettings and req.hrContext (with the person's employee record) for the controller.
 */
const hrRole = (...actions) => async (req, res, next) => {
  try {
    const settings = await loadSettings();
    if (!req.hrContext) req.hrContext = await loadContext(req.user);
    const role = hrRoleOf(req.user, req.hrContext);
    if (!actions.some((a) => can(role, a, settings))) return res.status(403).json({ error: 'You do not have access to this' });
    req.hrRole = role;
    req.hrSettings = settings;
    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * A change request's payload as this viewer may read it: pay values need emp.view_payroll, identity values
 * emp.view_sensitive. Whoever decides the current step sees everything they are approving.
 */
const maskPayload = (payload, { hrRole, deciding = false, settings = DEFAULTS } = {}) => {
  if (!payload || deciding) return { payload: payload || null, hidden: [] };
  const off = [
    ...(can(hrRole, 'emp.view_payroll', settings) ? [] : [...PAYROLL_FIELDS, 'salary_grade_id']),
    ...(can(hrRole, 'emp.view_sensitive', settings) ? [] : SENSITIVE_FIELDS),
  ];
  const hidden = Object.keys(payload).filter((k) => off.includes(k));
  return { payload: Object.fromEntries(Object.entries(payload).filter(([k]) => !hidden.includes(k))), hidden };
};

module.exports = {
  HR_ROLES, maskPayload, ROLE_LABELS, ACTIONS, DEFAULT_MATRIX, CEO_LOCKED, PAYROLL_FIELDS, SENSITIVE_FIELDS,
  mergeSettings, validateSettings, can, hrRoleOf, maskEmployee, loadSettings, clearSettingsCache, loadContext, hrRole,
};
