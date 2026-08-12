/**
 * waterTankCatalogue.controller.js — the Water Tank price schedule.
 *
 * The schedule was previously read-only in this module: the Settings screen
 * listed it and the only way to change anything was the shared
 * /service-catalog endpoints, which hard-delete without asking what the item is
 * committed to. Editing a price list that signed agreements are built from
 * deserves its own surface, with usage in view and history kept.
 */
const { asyncHandler, resolveBranchId } = require('../utils/controllerHelpers');
const svc = require('../services/wtCatalogue.service');

const actorOf = (req) => req.user?.name || req.user?.email || 'Operations';
const ctxOf = (req) => ({ branch_id: resolveBranchId(req), actor: actorOf(req), actor_id: req.user?.id || null });

const fail = (res, e) => {
  if (e instanceof svc.CatalogueError) {
    return res.status(e.status).json({
      error: e.message,
      ...(e.usage ? { usage: e.usage } : {}),
      ...(e.use_instead ? { use_instead: e.use_instead } : {}),
    });
  }
  throw e;
};

/** GET /api/wt-catalogue — the schedule, optionally with what each code is committed to. */
exports.list = asyncHandler(async (req, res) => {
  const items = await svc.listItems({
    branch_id: resolveBranchId(req),
    q: req.query.q || null,
    group: req.query.group || null,
    includeArchived: req.query.include_archived === '1' || req.query.include_archived === 'true',
    withUsage: req.query.with_usage === '1' || req.query.with_usage === 'true',
  });

  const priced = items.filter((i) => i.standard_price > 0);
  res.json({
    items,
    groups: svc.GROUPS,
    summary: {
      total: items.length,
      priced: priced.length,
      unpriced: items.length - priced.length,
      archived: items.filter((i) => !i.is_active).length,
      average_price: priced.length
        ? svc.round2(priced.reduce((s, i) => s + i.standard_price, 0) / priced.length) : 0,
      by_group: svc.GROUPS.map((g) => ({ group: g, count: items.filter((i) => i.group === g).length })),
    },
  });
});

/** GET /api/wt-catalogue/:id — one item, its usage and its full history. */
exports.detail = asyncHandler(async (req, res) => {
  const branch = resolveBranchId(req);
  const items = await svc.listItems({ branch_id: branch, includeArchived: true });
  const item = items.find((i) => String(i.id) === String(req.params.id));
  if (!item) return res.status(404).json({ error: 'That catalogue item was not found.' });

  const [usage, history] = await Promise.all([
    svc.usageOf(item.code, branch),
    svc.historyOf(item.id, branch),
  ]);
  res.json({ item, usage, history });
});

/** GET /api/wt-catalogue/:code/price-on?date= — what it cost on a given day. */
exports.priceOn = asyncHandler(async (req, res) => {
  const price = await svc.priceOn(req.params.code, req.query.date, resolveBranchId(req));
  res.json({ code: req.params.code, date: req.query.date || null, price });
});

exports.create = asyncHandler(async (req, res) => {
  try { res.json({ item: await svc.createItem(req.body || {}, ctxOf(req)), message: 'Item added to the schedule.' }); }
  catch (e) { fail(res, e); }
});

exports.update = asyncHandler(async (req, res) => {
  try {
    const out = await svc.updateItem(req.params.id, req.body || {}, ctxOf(req));
    res.json({ ...out, message: 'Item updated.' });
  } catch (e) { fail(res, e); }
});

exports.archive = asyncHandler(async (req, res) => {
  try {
    const item = await svc.archiveItem(req.params.id, ctxOf(req), { reason: req.body?.reason });
    res.json({ item, message: `${item.code} withdrawn from the active schedule. Existing documents are unaffected.` });
  } catch (e) { fail(res, e); }
});

exports.restore = asyncHandler(async (req, res) => {
  try { res.json({ item: await svc.restoreItem(req.params.id, ctxOf(req)), message: 'Item returned to the schedule.' }); }
  catch (e) { fail(res, e); }
});

exports.clone = asyncHandler(async (req, res) => {
  try { res.json({ item: await svc.cloneItem(req.params.id, req.body || {}, ctxOf(req)), message: 'Item cloned.' }); }
  catch (e) { fail(res, e); }
});

/**
 * DELETE /api/wt-catalogue/:id — only ever for an item nothing has priced
 * against. Everything else is refused with a pointer at archiving.
 */
exports.remove = asyncHandler(async (req, res) => {
  try { res.json(await svc.deleteItem(req.params.id, ctxOf(req))); }
  catch (e) { fail(res, e); }
});
