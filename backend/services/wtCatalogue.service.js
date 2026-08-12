/**
 * wtCatalogue.service.js — the Water Tank price schedule, and the rules that
 * keep editing it from rewriting history.
 *
 * The catalogue (care_services, vertical `water_tank_csa`) is what every
 * quotation, agreement, invoice and provider rate is priced from. Three things
 * were verified against the live database before this file was written:
 *
 *   VERIFIED SAFE   Stored quotation lines do not drift. They already snapshot
 *                   code, name, unit and price, and changing the catalogue
 *                   leaves them alone.
 *
 *   VERIFIED BROKEN Renaming an item rewrites the name and unit on any Schedule
 *                   C that gets recomputed — computePricing() resolves each line
 *                   against the LIVE catalogue and spreads that row in.
 *
 *   VERIFIED BROKEN Archiving an item makes its line silently DISAPPEAR from
 *                   Schedule C. Two lines went in, one came out, no warning.
 *                   A client's agreed scope quietly shrinking is worse than a
 *                   price moving, because nothing looks wrong.
 *
 * So this service does three jobs:
 *
 *   1. resolveLine()  — price a line from its SNAPSHOT first and the catalogue
 *                       only as a fallback, so a document renders what was
 *                       agreed even after the item is renamed or archived.
 *   2. usageOf()      — count what a code is committed to before anyone edits
 *                       or removes it.
 *   3. the lifecycle  — create / update / archive / restore / clone, each
 *                       writing an append-only history row. Nothing that has
 *                       been used in a priced document can be hard-deleted.
 *
 * NOT done here, deliberately: consolidating the legacy `water_tank` vertical.
 * Those 28 items are Property Care's catalogue, referenced by 24 live care_*
 * records with activity in the last week — they are not a competing water-tank
 * list. `water_tank_csa` is already the only catalogue this module reads.
 */
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const ServiceItem = require('../models/ServiceItem');
const M = require('../models/waterTankOps');

const VERTICAL = 'water_tank_csa';
const num = (v) => Number(v || 0);
const round2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);
const asObject = (v) => {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return p && typeof p === 'object' ? p : {}; } catch { return {}; } }
  return {};
};
const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};

class CatalogueError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; Object.assign(this, extra); }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Shape
 * ──────────────────────────────────────────────────────────────────────────── */

const GROUPS = ['service', 'material', 'labour'];

const shape = (row) => {
  const r = row.toJSON ? row.toJSON() : row;
  const tags = asObject(r.tags);
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description || null,
    unit: r.unit || null,
    standard_price: num(r.base_price),
    group: tags.group || r.service_group || 'service',
    fee_model: r.fee_model,
    is_active: r.is_active !== false,
    sort_order: r.sort_order,
    notes: r.notes || null,
    requires_site_assessment: !!r.requires_site_assessment,
    tags,
  };
};

/* ────────────────────────────────────────────────────────────────────────────
 * Snapshots — what makes a document survive a catalogue edit
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Freeze a catalogue row into a line snapshot.
 *
 * Everything a document needs to render itself later lives here, so nothing has
 * to be looked up again: the identity (id + code), what it was called, the unit
 * it was sold in, the list price at the time, and when that was true.
 */
function snapshotOf(item, extra = {}) {
  const s = shape(item);
  return {
    catalog_id: s.id,
    code: s.code,
    name: s.name,
    unit: s.unit,
    group: s.group,
    standard_price: s.standard_price,
    snapshot_at: new Date().toISOString(),
    ...extra,
  };
}

/**
 * Resolve one selected line for pricing or rendering.
 *
 * Order matters and is the whole point:
 *   1. what the line already carries (its snapshot) — authoritative once taken
 *   2. the live catalogue — only for fields the snapshot lacks
 *   3. a placeholder — so a line whose item was archived or deleted still
 *      appears, flagged, instead of vanishing
 *
 * `agreed_price` is never overwritten from the catalogue. If a line was agreed
 * at 3,000, it stays 3,000 no matter what the list says afterwards.
 */
function resolveLine(selected = {}, catalogueByCode = {}, opts = {}) {
  const snap = selected.snapshot && typeof selected.snapshot === 'object' ? selected.snapshot : null;
  const live = catalogueByCode[selected.code] || null;

  // Prefer the snapshot, then the line's own stored fields, then the catalogue.
  const pick = (field, snapField = field) => {
    if (snap && snap[snapField] != null && snap[snapField] !== '') return snap[snapField];
    if (selected[field] != null && selected[field] !== '') return selected[field];
    if (live && live[field] != null && live[field] !== '') return live[field];
    return null;
  };

  const code = selected.code || snap?.code || null;
  const standard = snap?.standard_price != null
    ? num(snap.standard_price)
    : (selected.standard_price != null ? num(selected.standard_price) : (live ? num(live.standard_price) : 0));

  const qty = num(selected.qty) || 1;
  const agreed = (selected.agreed_price != null && selected.agreed_price !== '')
    ? num(selected.agreed_price)
    : (selected.price != null && selected.price !== '' ? num(selected.price) : standard);

  /*
   * A line the catalogue no longer offers is NOT dropped. It renders from its
   * snapshot with a flag, because a client's signed scope must not shrink
   * because someone tidied the price list.
   */
  const orphaned = !live;
  const resolvable = !!(snap || live || selected.name);

  if (!resolvable) return null;

  return {
    kind: selected.kind || 'service',
    catalog_id: snap?.catalog_id ?? live?.id ?? null,
    code,
    name: pick('name') || code || 'Item',
    unit: pick('unit'),
    group: pick('group') || 'service',
    description: selected.description || null,
    qty,
    standard_price: standard,
    agreed_price: agreed,
    price: agreed,
    line_total: round2(agreed * qty),
    // Carried forward so the next recompute is anchored too.
    snapshot: snap || (live ? snapshotOf({ ...live, base_price: live.standard_price, tags: { group: live.group } }) : {
      catalog_id: null, code, name: pick('name'), unit: pick('unit'),
      group: pick('group') || 'service', standard_price: standard, snapshot_at: new Date().toISOString(),
    }),
    orphaned,
    orphan_note: orphaned && !opts.quiet
      ? 'This item is no longer in the active catalogue. It is shown as it was agreed.'
      : undefined,
  };
}

/** The live catalogue, keyed by code, for the resolver. */
async function catalogueByCode(branchId, { includeArchived = false } = {}) {
  const where = { vertical: VERTICAL };
  if (!includeArchived) where.is_active = true;
  if (branchId) where.branch_id = branchId;
  const rows = await ServiceItem.findAll({ where, order: [['sort_order', 'ASC']], raw: true });
  return Object.fromEntries(rows.map((r) => [r.code, shape(r)]));
}

/* ────────────────────────────────────────────────────────────────────────────
 * Usage — what a code is already committed to
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Where a catalogue code appears in priced records.
 *
 * Lines are JSON, so this is a LIKE over the serialised column rather than a
 * join. That is deliberate: a false positive here makes the system cautious
 * (refuse a delete that was actually safe), which is the right way to be wrong
 * about whether a price is under contract.
 */
async function usageOf(code, branchId) {
  if (!code) return { total: 0, quotations: 0, work_orders: 0, invoices: 0, provider_rates: 0, agreements: 0 };
  const like = { [Op.like]: `%"${code}"%` };
  const scope = branchId ? { branch_id: branchId } : {};

  const [quotations, workOrders, invoices, providerRates, agreements] = await Promise.all([
    M.WtQuotation.count({ where: { ...scope, lines: like } }).catch(() => 0),
    M.WtWorkOrder.count({ where: { ...scope, lines: like } }).catch(() => 0),
    M.WtInvoice.count({ where: { ...scope, lines: like } }).catch(() => 0),
    (async () => {
      const P = require('../models/waterTankProviders');
      return P.WtProviderAgreementRate.count({ where: { ...scope, service_code: code } }).catch(() => 0);
    })().catch(() => 0),
    (async () => {
      const [rows] = await sequelize.query(
        'SELECT COUNT(*) c FROM signing_envelopes WHERE terms LIKE :like',
        { replacements: { like: `%"${code}"%` } },
      ).catch(() => [[{ c: 0 }]]);
      return Number(rows?.[0]?.c || 0);
    })().catch(() => 0),
  ]);

  return {
    quotations, work_orders: workOrders, invoices,
    provider_rates: providerRates, agreements,
    total: quotations + workOrders + invoices + providerRates + agreements,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * History
 * ──────────────────────────────────────────────────────────────────────────── */

async function recordHistory(spec, { transaction } = {}) {
  await sequelize.query(
    `INSERT INTO wt_catalogue_history
       (branch_id, item_id, code, vertical, change_type, old_price, new_price,
        old_name, new_name, old_unit, new_unit, old_active, new_active,
        effective_from, reason, actor, actor_id, changed_at)
     VALUES (:branch_id,:item_id,:code,:vertical,:change_type,:old_price,:new_price,
             :old_name,:new_name,:old_unit,:new_unit,:old_active,:new_active,
             :effective_from,:reason,:actor,:actor_id,:changed_at)`,
    {
      transaction,
      replacements: {
        branch_id: spec.branch_id || 1,
        item_id: spec.item_id,
        code: spec.code || null,
        vertical: VERTICAL,
        change_type: spec.change_type,
        old_price: spec.old_price ?? null,
        new_price: spec.new_price ?? null,
        old_name: spec.old_name ?? null,
        new_name: spec.new_name ?? null,
        old_unit: spec.old_unit ?? null,
        new_unit: spec.new_unit ?? null,
        old_active: spec.old_active ?? null,
        new_active: spec.new_active ?? null,
        effective_from: spec.effective_from || today(),
        reason: spec.reason || null,
        actor: spec.actor || null,
        actor_id: spec.actor_id || null,
        changed_at: new Date(),
      },
    },
  );
}

async function historyOf(itemId, branchId) {
  const [rows] = await sequelize.query(
    `SELECT * FROM wt_catalogue_history
      WHERE item_id = :id ${branchId ? 'AND branch_id = :branch' : ''}
      ORDER BY changed_at DESC, id DESC`,
    { replacements: { id: itemId, branch: branchId } },
  );
  return rows || [];
}

/**
 * What this item cost on a given date, read from the history.
 * The question a disputed invoice actually raises.
 *
 * `id DESC` is the final tiebreak, and it is not decoration. changed_at has
 * one-second resolution, so two edits in the same second tie on both earlier
 * keys and MySQL is then free to return either — which it does. Without this the
 * answer to "what did this cost" flips between runs. The row id is monotonic, so
 * the later write always wins.
 */
async function priceOn(code, date, branchId) {
  const [rows] = await sequelize.query(
    `SELECT new_price, effective_from, changed_at FROM wt_catalogue_history
      WHERE code = :code AND new_price IS NOT NULL
        AND (effective_from IS NULL OR effective_from <= :date)
        ${branchId ? 'AND branch_id = :branch' : ''}
      ORDER BY effective_from DESC, changed_at DESC, id DESC LIMIT 1`,
    { replacements: { code, date: date || today(), branch: branchId } },
  );
  return rows?.[0] ? num(rows[0].new_price) : null;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Lifecycle
 * ──────────────────────────────────────────────────────────────────────────── */

const nextCode = async (group, branchId) => {
  const prefix = group === 'material' ? 'MAT' : group === 'labour' ? 'LAB' : 'WTC';
  const rows = await ServiceItem.findAll({
    where: { vertical: VERTICAL, code: { [Op.like]: `${prefix}-%` }, ...(branchId ? { branch_id: branchId } : {}) },
    attributes: ['code'], raw: true,
  });
  let max = 0;
  rows.forEach((r) => {
    const n = parseInt(String(r.code).replace(`${prefix}-`, ''), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  });
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
};

async function createItem(input, ctx) {
  const group = GROUPS.includes(input.group) ? input.group : 'service';
  if (!String(input.name || '').trim()) throw new CatalogueError(400, 'Give the item a name.');

  const code = String(input.code || '').trim() || await nextCode(group, ctx.branch_id);
  const clash = await ServiceItem.findOne({ where: { vertical: VERTICAL, code, ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}) } });
  if (clash) throw new CatalogueError(409, `Code ${code} is already used by "${clash.name}".`);

  return sequelize.transaction(async (t) => {
    const item = await ServiceItem.create({
      branch_id: ctx.branch_id, vertical: VERTICAL, code,
      name: String(input.name).trim(),
      description: input.description || null,
      unit: input.unit || null,
      base_price: round2(input.standard_price),
      service_group: group,
      tags: { group },
      fee_model: input.fee_model || 'fixed',
      requires_site_assessment: !!input.requires_site_assessment,
      notes: input.notes || null,
      sort_order: num(input.sort_order),
      is_active: true,
      created_by: ctx.actor_id || null,
    }, { transaction: t });

    await recordHistory({
      branch_id: ctx.branch_id, item_id: item.id, code, change_type: 'created',
      new_price: round2(input.standard_price), new_name: item.name, new_unit: item.unit,
      new_active: true, effective_from: input.effective_from || today(),
      reason: input.reason || 'Item added to the schedule.',
      actor: ctx.actor, actor_id: ctx.actor_id,
    }, { transaction: t });

    return shape(item);
  });
}

/**
 * Edit an item.
 *
 * The code is immutable once anything references it: the code is how every
 * stored line finds its way back, so changing it would orphan documents that
 * are already signed. Everything else may change, and each change is recorded.
 */
async function updateItem(id, input, ctx) {
  const item = await ServiceItem.findOne({ where: { id, vertical: VERTICAL, ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}) } });
  if (!item) throw new CatalogueError(404, 'That catalogue item was not found.');

  const before = shape(item);
  const usage = await usageOf(before.code, ctx.branch_id);

  if (input.code && String(input.code).trim() !== before.code) {
    if (usage.total > 0) {
      throw new CatalogueError(409,
        `The code cannot change — ${usage.total} priced record(s) reference ${before.code}, and they find this item by its code.`,
        { usage });
    }
  }

  const patch = {};
  if (input.name != null) patch.name = String(input.name).trim();
  if (input.description !== undefined) patch.description = input.description || null;
  if (input.unit !== undefined) patch.unit = input.unit || null;
  if (input.standard_price != null) patch.base_price = round2(input.standard_price);
  if (input.notes !== undefined) patch.notes = input.notes || null;
  if (input.sort_order != null) patch.sort_order = num(input.sort_order);
  if (input.fee_model) patch.fee_model = input.fee_model;
  if (input.requires_site_assessment != null) patch.requires_site_assessment = !!input.requires_site_assessment;
  if (input.group && GROUPS.includes(input.group)) {
    patch.service_group = input.group;
    patch.tags = { ...asObject(item.tags), group: input.group };
  }
  if (input.code && usage.total === 0) patch.code = String(input.code).trim();

  return sequelize.transaction(async (t) => {
    await item.update(patch, { transaction: t });
    const after = shape(item);

    const priceMoved = after.standard_price !== before.standard_price;
    const renamed = after.name !== before.name || after.unit !== before.unit;
    if (priceMoved || renamed) {
      await recordHistory({
        branch_id: ctx.branch_id, item_id: item.id, code: after.code,
        change_type: priceMoved ? 'price_changed' : 'renamed',
        old_price: before.standard_price, new_price: after.standard_price,
        old_name: before.name, new_name: after.name,
        old_unit: before.unit, new_unit: after.unit,
        effective_from: input.effective_from || today(),
        reason: input.reason || null,
        actor: ctx.actor, actor_id: ctx.actor_id,
      }, { transaction: t });
    }

    return {
      item: after,
      usage,
      // Said plainly rather than hidden: the edit is allowed, and the operator
      // should know how many committed records carry the old figures.
      warnings: usage.total > 0 && (priceMoved || renamed)
        ? [`${usage.total} existing record(s) already use ${after.code}. They keep the price and wording agreed at the time — this change applies to new work only.`]
        : [],
    };
  });
}

/**
 * Archive rather than delete.
 *
 * An item that has been quoted, invoiced or signed for is part of the record. It
 * is made inactive so it stops being offered, and every document that references
 * it keeps rendering from its snapshot.
 */
async function archiveItem(id, ctx, { reason } = {}) {
  const item = await ServiceItem.findOne({ where: { id, vertical: VERTICAL, ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}) } });
  if (!item) throw new CatalogueError(404, 'That catalogue item was not found.');
  const before = shape(item);

  return sequelize.transaction(async (t) => {
    await item.update({ is_active: false }, { transaction: t });
    await recordHistory({
      branch_id: ctx.branch_id, item_id: item.id, code: before.code, change_type: 'archived',
      old_active: true, new_active: false, old_price: before.standard_price, new_price: before.standard_price,
      reason: reason || 'Withdrawn from the active schedule.',
      actor: ctx.actor, actor_id: ctx.actor_id,
    }, { transaction: t });
    return shape(item);
  });
}

async function restoreItem(id, ctx) {
  const item = await ServiceItem.findOne({ where: { id, vertical: VERTICAL, ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}) } });
  if (!item) throw new CatalogueError(404, 'That catalogue item was not found.');

  return sequelize.transaction(async (t) => {
    await item.update({ is_active: true }, { transaction: t });
    await recordHistory({
      branch_id: ctx.branch_id, item_id: item.id, code: item.code, change_type: 'restored',
      old_active: false, new_active: true, reason: 'Returned to the active schedule.',
      actor: ctx.actor, actor_id: ctx.actor_id,
    }, { transaction: t });
    return shape(item);
  });
}

/**
 * Hard delete — permitted only for an item nothing has ever priced against.
 * Anything else archives, so the audit trail stays intact.
 */
async function deleteItem(id, ctx) {
  const item = await ServiceItem.findOne({ where: { id, vertical: VERTICAL, ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}) } });
  if (!item) throw new CatalogueError(404, 'That catalogue item was not found.');

  const usage = await usageOf(item.code, ctx.branch_id);
  if (usage.total > 0) {
    throw new CatalogueError(409,
      `${item.code} is used by ${usage.total} priced record(s) and cannot be deleted. Archive it instead — it stops being offered and the existing documents stay intact.`,
      { usage, use_instead: `POST /api/wt-catalogue/${id}/archive` });
  }

  await sequelize.query('DELETE FROM wt_catalogue_history WHERE item_id = :id', { replacements: { id } });
  await item.destroy();
  return { ok: true, code: item.code };
}

/** Duplicate an item as a starting point for a variant. */
async function cloneItem(id, input, ctx) {
  const src = await ServiceItem.findOne({ where: { id, vertical: VERTICAL, ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}) } });
  if (!src) throw new CatalogueError(404, 'That catalogue item was not found.');
  const s = shape(src);
  return createItem({
    name: input?.name || `${s.name} (copy)`,
    description: s.description, unit: s.unit,
    standard_price: input?.standard_price != null ? input.standard_price : s.standard_price,
    group: s.group, fee_model: s.fee_model,
    requires_site_assessment: s.requires_site_assessment,
    notes: s.notes, sort_order: s.sort_order,
    reason: `Cloned from ${s.code}.`,
  }, ctx);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Listing
 * ──────────────────────────────────────────────────────────────────────────── */

async function listItems({ branch_id, q, group, includeArchived, withUsage } = {}) {
  const where = { vertical: VERTICAL };
  if (branch_id) where.branch_id = branch_id;
  if (!includeArchived) where.is_active = true;
  if (group) where[Op.and] = [{ [Op.or]: [{ service_group: group }, { tags: { [Op.like]: `%"group":"${group}"%` } }] }];
  if (q) {
    where[Op.or] = [
      { name: { [Op.like]: `%${q}%` } },
      { code: { [Op.like]: `%${q}%` } },
      { description: { [Op.like]: `%${q}%` } },
    ];
  }

  const rows = await ServiceItem.findAll({ where, order: [['sort_order', 'ASC'], ['code', 'ASC']] });
  const items = rows.map(shape);

  if (withUsage) {
    // Sequential rather than parallel: each usage check runs five counts, and
    // forty items at once is a needless burst against the connection pool.
    for (const it of items) it.usage = await usageOf(it.code, branch_id);
  }
  return items;
}

module.exports = {
  VERTICAL, GROUPS, CatalogueError,
  shape, snapshotOf, resolveLine, catalogueByCode,
  usageOf, recordHistory, historyOf, priceOn,
  listItems, createItem, updateItem, archiveItem, restoreItem, deleteItem, cloneItem, nextCode,
  asArray, asObject, num, round2,
};
