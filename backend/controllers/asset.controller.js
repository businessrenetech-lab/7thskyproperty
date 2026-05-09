const Asset = require('../models/Asset');
const { Op } = require('sequelize');
const { ensureAssetSchema } = require('../utils/assetSchema');

const OPTIONAL_STRING_FIELDS = ['asset_tag', 'category', 'serial_no', 'location', 'image_url', 'condition_notes', 'notes'];
const OPTIONAL_DATE_FIELDS = ['purchase_date', 'warranty_expiry', 'last_maintained'];
const NUMERIC_FIELDS = ['cost', 'book_value', 'depreciation_rate'];
const EDITABLE_FIELDS = [
  'asset_tag', 'name', 'type', 'category', 'serial_no', 'location', 'image_url',
  'purchase_date', 'cost', 'book_value', 'depreciation_rate', 'warranty_expiry',
  'status', 'condition_notes', 'last_maintained', 'notes'
];

const getBranchFilter = (req) => {
  if (req.scopedBranchId === null) return {};
  return { branch_id: req.scopedBranchId || req.branchId };
};

const sanitizeAssetPayload = (body) => {
  const payload = {};
  EDITABLE_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) payload[field] = body[field];
  });

  [...OPTIONAL_STRING_FIELDS, ...OPTIONAL_DATE_FIELDS].forEach((field) => {
    if (payload[field] === '') payload[field] = null;
  });

  NUMERIC_FIELDS.forEach((field) => {
    if (payload[field] === '') payload[field] = null;
  });

  return payload;
};

const getAssetImageUrl = (req) => req.file ? `/uploads/assets/${req.file.filename}` : undefined;

exports.getAssets = async (req, res) => {
  try {
    await ensureAssetSchema();
    const where = getBranchFilter(req);
    
    // Optional filters
    if (req.query.status) where.status = req.query.status;
    if (req.query.type) where.type = req.query.type;
    if (req.query.category) where.category = req.query.category;
    if (req.query.location) where.location = { [Op.like]: `%${req.query.location}%` };
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${req.query.search}%` } },
        { asset_tag: { [Op.like]: `%${req.query.search}%` } },
        { serial_no: { [Op.like]: `%${req.query.search}%` } },
        { location: { [Op.like]: `%${req.query.search}%` } }
      ];
    }

    const assets = await Asset.findAll({ where, order: [['created_at', 'DESC']] });
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAssetStats = async (req, res) => {
  try {
    await ensureAssetSchema();
    const where = getBranchFilter(req);
    const allAssets = await Asset.findAll({ where });

    const total = allAssets.length;
    const good = allAssets.filter(a => ['active', 'good'].includes(a.status)).length;
    const needsService = allAssets.filter(a => ['maintenance', 'repair'].includes(a.status)).length;
    const disposed = allAssets.filter(a => ['disposed', 'lost', 'retired'].includes(a.status)).length;
    const totalBookValue = allAssets.reduce((sum, a) => sum + (parseFloat(a.book_value) || parseFloat(a.cost) || 0), 0);
    const totalCost = allAssets.reduce((sum, a) => sum + (parseFloat(a.cost) || 0), 0);

    res.json({
      total,
      good,
      needsService,
      disposed,
      totalBookValue,
      totalCost
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createAsset = async (req, res) => {
  try {
    await ensureAssetSchema();
    const payload = sanitizeAssetPayload(req.body);
    const imageUrl = getAssetImageUrl(req);
    const branchId = req.scopedBranchId || req.branchId;

    // Auto-generate asset_tag if not provided
    let assetTag = payload.asset_tag;
    if (!assetTag) {
      const count = await Asset.count({ where: { branch_id: branchId } });
      assetTag = `AST-${String(count + 1).padStart(3, '0')}`;
    }

    // Calculate initial book_value if not provided
    const bookValue = payload.book_value ?? payload.cost ?? 0;

    const asset = await Asset.create({
      ...payload,
      asset_tag: assetTag,
      ...(imageUrl ? { image_url: imageUrl } : {}),
      book_value: bookValue,
      branch_id: branchId
    });
    res.status(201).json(asset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateAsset = async (req, res) => {
  try {
    await ensureAssetSchema();
    const asset = await Asset.findOne({
      where: { id: req.params.id, ...getBranchFilter(req) }
    });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    
    const { branch_id, ...updateData } = sanitizeAssetPayload(req.body);
    const imageUrl = getAssetImageUrl(req);
    if (imageUrl) updateData.image_url = imageUrl;
    await asset.update(updateData);
    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteAsset = async (req, res) => {
  try {
    await ensureAssetSchema();
    const asset = await Asset.findOne({
      where: { id: req.params.id, ...getBranchFilter(req) }
    });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    
    await asset.destroy();
    res.json({ message: 'Asset deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
