const Asset = require('../models/Asset');
const { Op } = require('sequelize');

exports.getAssets = async (req, res) => {
  try {
    const where = { branch_id: req.branchId };
    
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
    const where = { branch_id: req.branchId };
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
    // Auto-generate asset_tag if not provided
    let assetTag = req.body.asset_tag;
    if (!assetTag) {
      const count = await Asset.count({ where: { branch_id: req.branchId } });
      assetTag = `AST-${String(count + 1).padStart(3, '0')}`;
    }

    // Calculate initial book_value if not provided
    const bookValue = req.body.book_value || req.body.cost || 0;

    const asset = await Asset.create({
      ...req.body,
      asset_tag: assetTag,
      book_value: bookValue,
      branch_id: req.branchId
    });
    res.status(201).json(asset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateAsset = async (req, res) => {
  try {
    const asset = await Asset.findOne({ 
      where: { id: req.params.id, branch_id: req.branchId } 
    });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    
    const { branch_id, ...updateData } = req.body;
    await asset.update(updateData);
    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findOne({ 
      where: { id: req.params.id, branch_id: req.branchId } 
    });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    
    await asset.destroy();
    res.json({ message: 'Asset deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
