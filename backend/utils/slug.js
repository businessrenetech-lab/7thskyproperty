const { Op } = require('sequelize');

const slugify = (value, fallback = 'item') => {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return slug || fallback;
};

const uniqueSlug = async (model, source, options = {}) => {
  const baseSlug = slugify(source, options.fallback || 'item');
  const whereBase = options.excludeId
    ? { id: { [Op.ne]: options.excludeId } }
    : {};
  let candidate = baseSlug;
  let suffix = 2;

  while (await model.findOne({ where: { ...whereBase, slug: candidate } })) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

module.exports = { slugify, uniqueSlug };
