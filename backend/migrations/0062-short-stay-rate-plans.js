'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('short_stay_rate_plans')) {
      await queryInterface.createTable('short_stay_rate_plans', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: Sequelize.INTEGER, allowNull: false },
        property_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'properties', key: 'id' },
          onDelete: 'CASCADE',
        },
        name: { type: Sequelize.STRING(120), allowNull: false },
        start_date: { type: Sequelize.DATEONLY, allowNull: false },
        end_date: { type: Sequelize.DATEONLY, allowNull: false },
        nightly_rate: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
        weekend_rate: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
        min_nights: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        priority: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });
    }
    const indexes = await queryInterface.showIndex('short_stay_rate_plans');
    const hasDates = indexes.some((index) => index.name === 'short_stay_rate_plans_property_dates_idx');
    if (!hasDates) {
      await queryInterface.addIndex('short_stay_rate_plans', ['branch_id', 'property_id', 'start_date', 'end_date'], {
        name: 'short_stay_rate_plans_property_dates_idx',
      });
    }
  },

  down: async (queryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('short_stay_rate_plans')) await queryInterface.dropTable('short_stay_rate_plans');
  },
};
