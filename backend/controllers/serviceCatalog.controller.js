/**
 * serviceCatalog.controller.js — Property Care Services catalog.
 * Categories form an arbitrary-depth tree; services (items) hang off categories,
 * each with its fee model + Seventh Sky fee + provider-pay split.
 */
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const ServiceCategory = require('../models/ServiceCategory');
const ServiceItem = require('../models/ServiceItem');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');

const CAT_FIELDS = ['parent_id', 'vertical', 'name', 'code', 'slug', 'description', 'icon', 'sort_order', 'is_active'];
const ITEM_FIELDS = ['category_id', 'vertical', 'name', 'code', 'description', 'service_group', 'fee_model', 'base_price', 'unit',
  'sspc_fee_type', 'sspc_fee_value', 'provider_pay_type', 'provider_pay_value', 'delivery_mode', 'applicable_to',
  'requires_site_assessment', 'tags', 'is_active', 'sort_order', 'notes'];
const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ─── VERTICALS (distinct service lines) ─────────────────────────────────────
exports.verticals = asyncHandler(async (req, res) => {
  const rows = await ServiceCategory.findAll({
    where: { ...branchScope(req), parent_id: null }, order: [['sort_order', 'ASC'], ['name', 'ASC']],
  });
  const counts = await ServiceItem.findAll({
    where: branchScope(req), attributes: ['vertical', [sequelize.fn('COUNT', sequelize.col('id')), 'c']], group: ['vertical'], raw: true,
  });
  const cmap = counts.reduce((a, r) => { a[r.vertical] = Number(r.c); return a; }, {});
  res.json({ data: rows.map((r) => ({ ...r.toJSON(), service_count: cmap[r.vertical] || 0 })) });
});

// ─── TREE (nested categories + their services) ──────────────────────────────
exports.tree = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.vertical) where.vertical = req.query.vertical;
  const [cats, items] = await Promise.all([
    ServiceCategory.findAll({ where, order: [['sort_order', 'ASC'], ['name', 'ASC']] }),
    ServiceItem.findAll({ where, order: [['sort_order', 'ASC'], ['name', 'ASC']] }),
  ]);
  const itemsByCat = items.reduce((a, it) => { (a[it.category_id] = a[it.category_id] || []).push(it.toJSON()); return a; }, {});
  const byParent = cats.reduce((a, c) => { const k = c.parent_id || 'root'; (a[k] = a[k] || []).push(c); return a; }, {});
  const build = (parentKey) => (byParent[parentKey] || []).map((c) => ({
    ...c.toJSON(),
    services: itemsByCat[c.id] || [],
    children: build(c.id),
  }));
  res.json({ data: build('root'), total_services: items.length, total_categories: cats.length });
});

// ─── CATEGORY CRUD ──────────────────────────────────────────────────────────
exports.createCategory = asyncHandler(async (req, res) => {
  const data = pick(req.body, CAT_FIELDS);
  if (!data.name) return res.status(400).json({ error: 'name is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.slug = data.slug || slugify(data.name);
  data.code = data.code || await generateCode(ServiceCategory, 'code', 'SVC-CAT-');
  if (!data.vertical && data.parent_id) {
    const parent = await ServiceCategory.findByPk(data.parent_id);
    if (parent) data.vertical = parent.vertical;
  }
  const cat = await ServiceCategory.create(data);
  res.status(201).json({ data: cat, message: 'Category created.' });
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const cat = await ServiceCategory.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!cat) return res.status(404).json({ error: 'Category not found.' });
  await cat.update(pick(req.body, CAT_FIELDS));
  res.json({ data: cat, message: 'Category updated.' });
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  const cat = await ServiceCategory.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!cat) return res.status(404).json({ error: 'Category not found.' });
  const childCount = await ServiceCategory.count({ where: { parent_id: cat.id } });
  const itemCount = await ServiceItem.count({ where: { category_id: cat.id } });
  if (childCount || itemCount) return res.status(400).json({ error: 'Move or delete its sub-categories and services first.' });
  await cat.destroy();
  res.json({ message: 'Category deleted.' });
});

// ─── SERVICE (ITEM) CRUD ────────────────────────────────────────────────────
exports.listItems = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.category_id) where.category_id = req.query.category_id;
  if (req.query.vertical) where.vertical = req.query.vertical;
  if (req.query.search) where.name = { [Op.like]: `%${req.query.search}%` };
  const rows = await ServiceItem.findAll({ where, include: [{ model: ServiceCategory, as: 'category', attributes: ['id', 'name'] }], order: [['sort_order', 'ASC'], ['name', 'ASC']] });
  res.json({ data: rows });
});

exports.createItem = asyncHandler(async (req, res) => {
  const data = pick(req.body, ITEM_FIELDS);
  if (!data.name) return res.status(400).json({ error: 'name is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.code = data.code || await generateCode(ServiceItem, 'code', 'SVC-');
  if (!data.vertical && data.category_id) {
    const cat = await ServiceCategory.findByPk(data.category_id);
    if (cat) data.vertical = cat.vertical;
  }
  const item = await ServiceItem.create(data);
  res.status(201).json({ data: item, message: 'Service created.' });
});

exports.updateItem = asyncHandler(async (req, res) => {
  const item = await ServiceItem.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!item) return res.status(404).json({ error: 'Service not found.' });
  await item.update(pick(req.body, ITEM_FIELDS));
  res.json({ data: item, message: 'Service updated.' });
});

exports.deleteItem = asyncHandler(async (req, res) => {
  const item = await ServiceItem.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!item) return res.status(404).json({ error: 'Service not found.' });
  await item.destroy();
  res.json({ message: 'Service deleted.' });
});
