const { Op } = require('sequelize');

/**
 * Generate a sequential, zero-padded code like "SSPC-CT-000123".
 * Looks at the highest existing code with the same prefix and increments.
 * @param {import('sequelize').Model} model  Sequelize model
 * @param {string} field   column holding the code (e.g. 'contact_code')
 * @param {string} prefix  e.g. 'SSPC-CT-'
 * @param {number} pad     digits to pad to (default 6)
 */
async function generateCode(model, field, prefix, pad = 6) {
  const last = await model.findOne({
    where: { [field]: { [Op.like]: `${prefix}%` } },
    order: [[field, 'DESC']],
    attributes: [field],
    raw: true,
  });
  let next = 1;
  if (last && last[field]) {
    const m = String(last[field]).match(/(\d+)\s*$/);
    if (m) next = parseInt(m[1], 10) + 1;
  }
  return `${prefix}${String(next).padStart(pad, '0')}`;
}

module.exports = { generateCode };
