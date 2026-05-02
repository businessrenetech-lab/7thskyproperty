const Rule = require('../models/Rule');
const automationService = require('../services/automation.service');

exports.getRules = async (req, res) => {
  try {
    const rules = await Rule.findAll({ order: [['created_at', 'DESC']] });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createRule = async (req, res) => {
  try {
    const rule = await Rule.create(req.body);
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.toggleRule = async (req, res) => {
  try {
    const rule = await Rule.findByPk(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    
    rule.is_active = !rule.is_active;
    await rule.save();
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteRule = async (req, res) => {
  try {
    const rule = await Rule.findByPk(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    
    await rule.destroy();
    res.json({ message: 'Rule deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.runBirthdayCheck = async (req, res) => {
  try {
    const result = await automationService.processBirthdayReminders();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
