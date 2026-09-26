/**
 * Rural tenant sourcing — the tenant side of the Rural Rent console.
 *
 * The SOP's sourcing pipeline (requirement → search → shortlist) was ALREADY
 * modelled as three register definitions, seeded from the client's CRM workbook
 * on 2026-06-26:
 *
 *   158  requirement_register       requirement · required · notes
 *   159  property_search_register   property_id · location · type · rent · source · status
 *   160  shortlist_register         property · inspection_date · outcome · priority
 *
 * So this is a view and an API over those registers, not three new tables. Every
 * row is a `register_entries` row carrying vertical_key 'rural_tenancy', which is
 * how /api/registers/entries?category=rural finds them too — one store, two doors.
 */
const RegisterEntry = require('../models/RegisterEntry');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');

const REGISTERS = { requirement: 158, search: 159, shortlist: 160 };
const VERTICAL = 'rural_tenancy';

/** JSON columns round-trip as strings in this DB (see AGENTS.md), so parse defensively. */
const asObject = (v) => {
  if (v && typeof v === 'object') return v;
  try { return JSON.parse(v || '{}'); } catch { return {}; }
};

/** An entry becomes a brief without losing the register's own column keys. */
function briefFromEntry(entry) {
  const e = entry && entry.toJSON ? entry.toJSON() : (entry || {});
  const data = asObject(e.data);
  return {
    id: e.id,
    client_id: e.client_id ?? null,
    property_id: e.property_id ?? null,
    status: e.status ?? null,
    created_at: e.created_at ?? null,
    ...data,
  };
}

/** Shortlist counts by outcome, with an honest bucket for rows that record none. */
function shortlistSummary(rows = []) {
  const byOutcome = {};
  for (const r of rows) {
    const outcome = String(asObject(r.data).outcome || '').trim() || 'unrecorded';
    byOutcome[outcome] = (byOutcome[outcome] || 0) + 1;
  }
  return { total: rows.length, byOutcome };
}

const listOf = async (req, definitionId, extraWhere = {}) => RegisterEntry.findAll({
  where: { ...branchScope(req), register_definition_id: definitionId, ...extraWhere },
  order: [['created_at', 'DESC']],
  limit: 500,
});

// GET /api/rural-sourcing/briefs
exports.listBriefs = asyncHandler(async (req, res) => {
  const rows = await listOf(req, REGISTERS.requirement,
    req.query.client_id ? { client_id: req.query.client_id } : {});
  res.json({ data: rows.map(briefFromEntry) });
});

// POST /api/rural-sourcing/briefs
exports.createBrief = asyncHandler(async (req, res) => {
  const meta = pick(req.body, ['client_id', 'property_id', 'status']);
  const data = pick(req.body, ['requirement', 'required', 'notes']);
  if (!data.requirement) return res.status(400).json({ error: 'requirement is required.' });
  const row = await RegisterEntry.create({
    ...meta,
    register_definition_id: REGISTERS.requirement,
    vertical_key: VERTICAL,
    branch_id: resolveBranchId(req, req.body.branch_id),
    created_by: req.user?.id || null,
    data,
  });
  res.status(201).json({ data: briefFromEntry(row), message: 'Tenant brief recorded.' });
});

// GET /api/rural-sourcing/search  ·  POST /api/rural-sourcing/search
exports.listSearch = asyncHandler(async (req, res) => {
  const rows = await listOf(req, REGISTERS.search);
  res.json({ data: rows.map(briefFromEntry) });
});

exports.addSearch = asyncHandler(async (req, res) => {
  const data = pick(req.body, ['property_id', 'location', 'type', 'rent', 'source', 'status']);
  const row = await RegisterEntry.create({
    ...pick(req.body, ['client_id']),
    register_definition_id: REGISTERS.search,
    vertical_key: VERTICAL,
    property_id: req.body.property_id || null,
    branch_id: resolveBranchId(req, req.body.branch_id),
    created_by: req.user?.id || null,
    data,
  });
  res.status(201).json({ data: briefFromEntry(row), message: 'Property recorded against the search.' });
});

// GET /api/rural-sourcing/shortlist  ·  POST /api/rural-sourcing/shortlist
exports.listShortlist = asyncHandler(async (req, res) => {
  const rows = await listOf(req, REGISTERS.shortlist);
  const plain = rows.map((r) => (r.toJSON ? r.toJSON() : r));
  res.json({ data: plain.map(briefFromEntry), summary: shortlistSummary(plain) });
});

exports.addShortlist = asyncHandler(async (req, res) => {
  const data = pick(req.body, ['property', 'inspection_date', 'outcome', 'priority']);
  const row = await RegisterEntry.create({
    ...pick(req.body, ['client_id']),
    register_definition_id: REGISTERS.shortlist,
    vertical_key: VERTICAL,
    property_id: req.body.property_id || null,
    branch_id: resolveBranchId(req, req.body.branch_id),
    created_by: req.user?.id || null,
    data,
  });
  res.status(201).json({ data: briefFromEntry(row), message: 'Shortlist row added.' });
});

// GET /api/rural-sourcing/summary — the counts the console header shows.
exports.summary = asyncHandler(async (req, res) => {
  const [briefs, search, shortlist] = await Promise.all([
    listOf(req, REGISTERS.requirement),
    listOf(req, REGISTERS.search),
    listOf(req, REGISTERS.shortlist),
  ]);
  const plainShortlist = shortlist.map((r) => (r.toJSON ? r.toJSON() : r));
  res.json({
    data: {
      briefs: briefs.length,
      searched: search.length,
      shortlist: shortlistSummary(plainShortlist),
      registers: REGISTERS,
    },
  });
});

module.exports.REGISTERS = REGISTERS;
module.exports.briefFromEntry = briefFromEntry;
module.exports.shortlistSummary = shortlistSummary;
