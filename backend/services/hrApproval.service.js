/**
 * HRM change requests (plan Task 3). Every change the client spec says needs approval becomes a request with
 * a chain of approver roles (M1 §6, M2 §9, M3 §5). Pure functions only; the controller stores the result and
 * hrAppliers.js writes the change once the last approver says yes. Unit-tested by scripts/testHrApproval.js.
 */

const ORG_KINDS = ['org.department.create', 'org.position.create', 'org.position.deactivate', 'org.reporting_line', 'org.salary_grade', 'org.restructure'];
const HR_MANAGER_KINDS = ['emp.create', 'emp.status', 'emp.transfer', 'emp.position', 'emp.supervisor'];
const CEO_KINDS = ['emp.salary', 'emp.promotion', 'emp.termination', 'emp.senior_appointment', 'emp.sensitive'];
const FINANCE_KINDS = ['emp.bank', 'emp.salary_structure', 'emp.allowance', 'emp.deduction'];
const KINDS = [...ORG_KINDS, ...HR_MANAGER_KINDS, ...CEO_KINDS, ...FINANCE_KINDS, 'emp.self_service', 'rec.vacancy', 'rec.hire', 'pay.run'];

const LABELS = {
  'org.department.create': 'New department', 'org.position.create': 'New position', 'org.position.deactivate': 'Position deletion',
  'org.reporting_line': 'Reporting line change', 'org.salary_grade': 'Salary grade change', 'org.restructure': 'Department restructure',
  'emp.create': 'New employee', 'emp.status': 'Employment status change', 'emp.transfer': 'Department transfer', 'emp.position': 'Position change',
  'emp.supervisor': 'Supervisor change', 'emp.salary': 'Salary change', 'emp.promotion': 'Promotion', 'emp.termination': 'Termination',
  'emp.senior_appointment': 'Senior role appointment', 'emp.sensitive': 'Sensitive profile change', 'emp.bank': 'Bank account change',
  'emp.salary_structure': 'Salary structure update', 'emp.allowance': 'Allowance update', 'emp.deduction': 'Deduction update',
  'emp.self_service': 'Profile update from the employee', 'rec.vacancy': 'Vacancy request', 'rec.hire': 'Hire', 'pay.run': 'Payroll',
};

/** Approver roles, in order, for a kind of change. */
const chainFor = (kind) => {
  if (ORG_KINDS.includes(kind)) return ['hr_manager', 'ceo'];                         // M1 §6
  if (HR_MANAGER_KINDS.includes(kind) || kind === 'emp.self_service' || kind === 'rec.hire') return ['hr_manager'];   // M2 §9, §12
  if (CEO_KINDS.includes(kind)) return ['hr_manager', 'ceo'];                         // HR raises, the CEO decides
  if (FINANCE_KINDS.includes(kind)) return ['finance_manager'];
  if (kind === 'rec.vacancy') return ['department_manager', 'hr_manager', 'finance_manager', 'ceo'];   // M3 §5
  if (kind === 'pay.run') return ['ceo'];                                             // HR prepares, the CEO approves, Accounts pays
  throw new Error(`Unknown change kind: ${kind}`);
};

/** May this person decide the request's current step? The CEO may act at any step; nobody on their own request. */
const canAct = (request, actor) => {
  if (!request || request.status !== 'pending' || !actor) return false;
  if (Number(request.requested_by) === Number(actor.id)) return false;               // Review Focus 1
  const step = (request.chain || [])[request.step];
  if (!step) return false;
  return actor.hrRole === 'ceo' || actor.hrRole === step.role;
};

/** Record a decision on the current step. Returns a new request object; the input is never changed. */
const advance = (request, actor, decision, comment, now) => {
  if (!canAct(request, actor)) throw Object.assign(new Error('You cannot decide this step'), { status: 403 });
  if (!['approve', 'reject'].includes(decision)) throw Object.assign(new Error('Decision must be approve or reject'), { status: 400 });
  const chain = request.chain.map((s) => ({ ...s }));
  chain[request.step] = { ...chain[request.step], decided_by: actor.id, decision, comment: comment || '', at: new Date(now).toISOString() };
  const last = request.step >= chain.length - 1;
  if (decision === 'reject') return { ...request, chain, status: 'rejected' };
  return { ...request, chain, step: last ? request.step : request.step + 1, status: last ? 'approved' : 'pending' };
};

// Kinds that change the same fields; two pending requests in one group for one entity conflict (Review Focus 2).
const GROUPS = [
  ['emp.salary', 'emp.salary_structure', 'emp.promotion', 'emp.allowance', 'emp.deduction'],
  ['emp.position', 'emp.promotion', 'emp.transfer', 'emp.senior_appointment'],
  ['emp.supervisor', 'emp.transfer'],
  ['emp.status', 'emp.termination'],
  ['emp.sensitive', 'emp.self_service'],
];
const overlaps = (a, b) => a === b || GROUPS.some((g) => g.includes(a) && g.includes(b));

/** A pending request that changes the same thing, or null. Creates (no entity yet) never conflict. */
const pendingConflict = (kind, entityType, entityId, pendingRequests = []) => {
  if (entityId == null) return null;
  return pendingRequests.find((r) => r.status === 'pending' && r.entity_type === entityType
    && Number(r.entity_id) === Number(entityId) && overlaps(kind, r.kind)) || null;
};

const asText = (v) => (v == null ? null : typeof v === 'object' ? JSON.stringify(v) : String(v));

/** One history row per field that differs between `before` and `after`. */
const diffToHistory = (before, after, meta = {}) => Object.keys(after || {})
  .filter((k) => asText((before || {})[k]) !== asText(after[k]))
  .map((field) => ({ ...meta, field, old_value: asText((before || {})[field]), new_value: asText(after[field]) }));

module.exports = { KINDS, ORG_KINDS, LABELS, chainFor, canAct, advance, pendingConflict, diffToHistory };
