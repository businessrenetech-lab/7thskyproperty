const Material = require('../models/Material');
const Batch = require('../models/Batch');
const User = require('../models/User');

exports.getMaterialsByBatch = async (req, res) => {
  try {
    const { batch_id } = req.params;
    const batch = await Batch.findOne({ where: { id: batch_id, branch_id: req.branchId } });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const materials = await Material.findAll({
      where: { batch_id },
      include: [{ model: User, as: 'Creator', attributes: ['name'] }],
      order: [['created_at', 'DESC']]
    });
    res.json(materials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createMaterial = async (req, res) => {
  try {
    const { batch_id, title, description, url, type } = req.body;
    const batch = await Batch.findOne({ where: { id: batch_id, branch_id: req.branchId } });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const material = await Material.create({
      batch_id,
      title,
      description,
      url,
      type,
      created_by: req.user.id
    });
    res.status(201).json(material);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const material = await Material.findOne({
      where: { id },
      include: [{ model: Batch, attributes: [], where: { branch_id: req.branchId } }]
    });
    if (!material) return res.status(404).json({ error: 'Material not found' });
    
    await material.destroy();
    res.json({ message: 'Material deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mock Communication Service for SMS/WhatsApp
exports.shareToBatch = async (req, res) => {
  try {
    const { batch_id, message, channel } = req.body; // channel: 'sms' or 'whatsapp'
    const batch = await Batch.findOne({ where: { id: batch_id, branch_id: req.branchId } });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    
    // In a real scenario, integrate with Twilio, GreenSMS, etc.
    console.log(`[COMMUNICATION] Sharing to Batch ${batch_id} via ${channel}: ${message}`);
    
    res.json({ success: true, message: `Dispatched to batch members via ${channel}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
