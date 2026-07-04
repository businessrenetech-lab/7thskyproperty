const sequelize = require('../config/db.config');
const { asyncHandler } = require('../utils/controllerHelpers');

// GET /api/services/verticals — business lines + workflows count
exports.verticals = asyncHandler(async (req, res) => {
  const [verticals] = await sequelize.query('SELECT * FROM verticals ORDER BY sort_order ASC');
  res.json({ data: verticals });
});

// GET /api/services — flat catalog (categories + services)
exports.catalog = asyncHandler(async (req, res) => {
  const [categories] = await sequelize.query('SELECT * FROM service_categories ORDER BY sort_order ASC, name ASC');
  const [services] = await sequelize.query('SELECT * FROM services ORDER BY sort_order ASC, name ASC');
  res.json({ data: { categories, services } });
});

// GET /api/services/workflows?vertical_key=leasing
exports.workflows = asyncHandler(async (req, res) => {
  const where = req.query.vertical_key ? 'WHERE vertical_key = :vk' : '';
  const [workflows] = await sequelize.query(
    `SELECT * FROM workflow_templates ${where} ORDER BY id ASC`,
    { replacements: { vk: req.query.vertical_key } }
  );
  res.json({ data: workflows });
});

// GET /api/services/registers?vertical_key=leasing
exports.registers = asyncHandler(async (req, res) => {
  const where = req.query.vertical_key ? 'WHERE vertical_key = :vk' : '';
  const [registers] = await sequelize.query(
    `SELECT id, vertical_key, register_key, name, columns, sort_order FROM register_definitions ${where} ORDER BY sort_order ASC`,
    { replacements: { vk: req.query.vertical_key } }
  );
  res.json({ data: registers });
});
