'use strict';

/**
 * Migration 0141: buyer mandates get a sales category (so the Business buyer
 * console can show only business mandates) and a suitability assessment
 * (Business Purchase SOP Step 2). Existing rows keep category NULL, which the
 * residential/commercial consoles never filter on — behaviour unchanged.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const t = await queryInterface.describeTable('buyer_mandates');
    if (!t.category) await queryInterface.addColumn('buyer_mandates', 'category', { type: Sequelize.STRING(20), allowNull: true });
    if (!t.suitability) await queryInterface.addColumn('buyer_mandates', 'suitability', { type: Sequelize.JSON, allowNull: true });
    const idx = await queryInterface.showIndex('buyer_mandates');
    if (!idx.some((i) => i.name === 'buyer_mandates_category')) await queryInterface.addIndex('buyer_mandates', ['category'], { name: 'buyer_mandates_category' });
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex('buyer_mandates', 'buyer_mandates_category').catch(() => {});
    await queryInterface.removeColumn('buyer_mandates', 'suitability').catch(() => {});
    await queryInterface.removeColumn('buyer_mandates', 'category').catch(() => {});
  },
};
