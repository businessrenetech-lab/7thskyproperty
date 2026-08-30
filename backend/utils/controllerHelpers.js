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

/**
 * The service line for this request, defaulting to Water Tank when unset so
 * existing single-service behaviour is unchanged. Set by the resolveServiceLine
 * middleware from the X-Service-Line header (or a route mount). Use like
 * branchScope: spread serviceScope(req) into a shared-table `where`.
 */
const { DEFAULT_SERVICE_LINE, SERVICE_LINE_KEYS } = require('../config/serviceLines');
function resolveServiceLine(req) {
  const raw = req.serviceLine || req.header?.('X-Service-Line') || req.headers?.['x-service-line'];
  return SERVICE_LINE_KEYS.includes(raw) ? raw : DEFAULT_SERVICE_LINE;
}
function serviceScope(req) {
  return { service_line: resolveServiceLine(req) };
}
// The ServiceItem catalogue is separated by `vertical` (not service_line), so a
// service line reads its own catalogue vertical (water_tank_csa, air_conditioning_csa…).
const { getServiceLine, codePrefix: codePrefixFor } = require('../config/serviceLines');
function catalogueVertical(req) {
  return getServiceLine(resolveServiceLine(req)).catalogue_vertical;
}
// Record-code prefix for the active service line + entity kind (client, project,
// request, assessment, quotation, work_order, invoice, provider) — so AC records
// are coded ACCM-C… / ACR-… rather than WTCM-C… / SR….
function codePrefix(req, kind) {
  return codePrefixFor(resolveServiceLine(req), kind);
}
// The active service line's UI vocabulary (labels, project types, categories,
// property types, equipment field labels) — so shared screens never show another
// service's wording. Always returns an object.
function serviceUi(req) {
  return getServiceLine(resolveServiceLine(req)).ui || {};
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

module.exports = { asyncHandler, branchScope, resolveBranchId, getPagination, pick, resolveServiceLine, serviceScope, catalogueVertical, serviceUi, codePrefix };
