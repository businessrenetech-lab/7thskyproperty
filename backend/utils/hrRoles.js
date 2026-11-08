/**
 * HR role groups (attendance, leave, shifts, biometric). Ported from the Hadi Real Estate roleGroups.
 * The route guards now use services/hrAccess (CEO-editable settings); HRM_READ/HRM_WRITE/BIOMETRIC remain for
 * older callers only.
 *
 *   NON_STAFF   users.role values that are clients, never staff. They are left out of every staff list,
 *               the attendance roster and leave balances.
 *   seesAllOffices(user)  company-level roles: may set the weekly closed day and every-office holidays.
 */
const NON_STAFF = Object.freeze(['owner', 'tenant', 'wt_client', 'wt_provider', 'client', 'guardian', 'customer', 'buyer', 'seller', 'student']);

const HRM_READ = Object.freeze(['super_admin', 'branch_admin', 'hr', 'hr_manager', 'hr_staff', 'accounts']);
const HRM_WRITE = Object.freeze(['super_admin', 'branch_admin', 'hr', 'hr_manager', 'hr_staff']);
const BIOMETRIC = Object.freeze(['super_admin', 'branch_admin', 'hr', 'hr_manager', 'hr_staff']);
const LEAVE_VIEW_OTHERS = Object.freeze(['super_admin', 'branch_admin', 'hr', 'hr_manager']);

const ALL_OFFICE_ROLES = Object.freeze(['super_admin']);
const roleOf = (u) => (u && typeof u === 'object' ? u.role : u);
const seesAllOffices = (u) => ALL_OFFICE_ROLES.includes(roleOf(u));
const isStaff = (u) => !!roleOf(u) && !NON_STAFF.includes(roleOf(u));

module.exports = { NON_STAFF, HRM_READ, HRM_WRITE, BIOMETRIC, LEAVE_VIEW_OTHERS, ALL_OFFICE_ROLES, seesAllOffices, isStaff };
