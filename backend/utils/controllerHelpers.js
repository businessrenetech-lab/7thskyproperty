/**
 * Shared controller helpers for the Seventh Sky API.
 */

// Wrap async route handlers so thrown errors hit the error middleware.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Branch scoping: super_admin sees all branches; everyone else is restricted
 * to their own branch. Returns a `where` fragment to spread into queries.
 */
function branchScope(req) {
  if (req.user && req.user.role === 'super_admin') return {};
  return { branch_id: req.branchId ?? req.user?.branch_id ?? null };
}

/** Resolve the branch_id to assign on create. */
function resolveBranchId(req, bodyBranchId) {
  if (req.user?.role === 'super_admin' && bodyBranchId) return bodyBranchId;
  return req.branchId ?? req.user?.branch_id ?? bodyBranchId ?? null;
}

/** Parse pagination params -> { limit, offset, page }. */
function getPagination(req, defaultLimit = 25, maxLimit = 100) {
  let limit = parseInt(req.query.limit, 10) || defaultLimit;
  if (limit > maxLimit) limit = maxLimit;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  return { limit, offset: (page - 1) * limit, page };
}

/** Pick only allowed fields from a body (whitelist mass-assignment). */
function pick(body, allowed) {
  const out = {};
  for (const key of allowed) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

module.exports = { asyncHandler, branchScope, resolveBranchId, getPagination, pick };
