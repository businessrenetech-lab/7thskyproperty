'use strict';

/**
 * Migration 0143: business assessments + due-diligence documents can belong to a
 * business PROPERTY (the shared sales engine) as well as a legacy business
 * listing (still used by Business Rent). Adds property_id, makes the listing id
 * nullable. Existing rows are untouched.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const table of ['business_assessments', 'business_documents']) {
      const t = await queryInterface.describeTable(table);
      if (!t.property_id) {
        await queryInterface.addColumn(table, 'property_id', { type: Sequelize.INTEGER, allowNull: true });
        await queryInterface.addIndex(table, ['property_id'], { name: `${table}_property_id` });
      }
      if (t.business_listing_id && t.business_listing_id.allowNull === false) {
        await queryInterface.changeColumn(table, 'business_listing_id', { type: Sequelize.INTEGER, allowNull: true });
      }
    }
  },
  down: async (queryInterface) => {
    for (const table of ['business_assessments', 'business_documents']) {
      await queryInterface.removeIndex(table, `${table}_property_id`).catch(() => {});
      await queryInterface.removeColumn(table, 'property_id').catch(() => {});
    }
  },
};
