'use strict';

/**
 * Migration 0146: register the business_purchase vertical so the Business
 * Purchase SOP workflow (0145) can be chosen in Projects / Services. Inserts
 * only when missing.
 */
module.exports = {
  up: async (queryInterface) => {
    const [have] = await queryInterface.sequelize.query("SELECT COUNT(*) AS n FROM verticals WHERE vertical_key = 'business_purchase'");
    if (Number(have[0].n) > 0) return;
    const now = new Date();
    await queryInterface.bulkInsert('verticals', [{
      vertical_key: 'business_purchase', name: 'Business Purchase', id_prefix: 'BBUY',
      dashboards: JSON.stringify(['Executive', 'Operations', 'Financial', 'Compliance']), config: '{}',
      sort_order: 12, is_active: true, is_hidden: false, created_at: now, updated_at: now,
    }]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('verticals', { vertical_key: 'business_purchase' });
  },
};
