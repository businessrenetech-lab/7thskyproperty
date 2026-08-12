/**
 * wtRoles.js — authorization for the Water Tank module.
 *
 * Every Water Tank route required authentication but none enforced a ROLE, so
 * any authenticated account — including a tenant or a property owner with a
 * portal login — could issue agreements, move lifecycle states, record receipts
 * and pay providers. Authentication answers "who are you"; it does not answer
 * "may you do this".
 *
 * Three tiers, deliberately coarse. A finer matrix is easy to add later and
 * hard to reason about now; the important line is the one between reading the
 * operation, running it, and moving money or binding the company legally.
 */

const { roleMiddleware } = require('./auth.middleware');

/** Anyone who works the operation can read it. */
const WT_READ = [
  'super_admin', 'branch_admin', 'property_manager', 'sales_executive',
  'accounts', 'operations', 'coordinator', 'technician',
];

/** Day-to-day operational writes: requests, assessments, work orders, visits. */
const WT_OPERATE = [
  'super_admin', 'branch_admin', 'property_manager', 'sales_executive',
  'operations', 'coordinator',
];

/**
 * Money and legal commitment: invoices, receipts, provider payouts,
 * agreements, and anything that voids or deletes a record.
 * Deliberately excludes sales_executive — quoting is not the same authority as
 * binding the company or moving cash.
 */
const WT_FINANCE = ['super_admin', 'branch_admin', 'accounts'];
const WT_LEGAL = ['super_admin', 'branch_admin', 'property_manager'];

/** Destructive actions stay with administrators. */
const WT_ADMIN = ['super_admin', 'branch_admin'];

module.exports = {
  WT_READ,
  WT_OPERATE,
  WT_FINANCE,
  WT_LEGAL,
  WT_ADMIN,
  canRead: roleMiddleware(WT_READ),
  canOperate: roleMiddleware(WT_OPERATE),
  // Money: recording a receipt, paying a provider, issuing or voiding an invoice.
  canTransact: roleMiddleware([...new Set([...WT_FINANCE, ...WT_ADMIN])]),
  // Legal: sending an agreement for signature, voiding an executed document.
  canBind: roleMiddleware([...new Set([...WT_LEGAL, ...WT_ADMIN])]),
  canAdminister: roleMiddleware(WT_ADMIN),
};
