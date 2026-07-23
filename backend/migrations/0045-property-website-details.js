'use strict';

/** Website listing dimensions not present in the original property master. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('properties');
    if (!table.balconies) await queryInterface.addColumn('properties', 'balconies', { type: Sequelize.INTEGER, allowNull: true });
    if (!table.total_units) await queryInterface.addColumn('properties', 'total_units', { type: Sequelize.INTEGER, allowNull: true });
    if (!table.building_height) await queryInterface.addColumn('properties', 'building_height', { type: Sequelize.STRING(40), allowNull: true });
    if (!table.unit_floor_plans) await queryInterface.addColumn('properties', 'unit_floor_plans', { type: Sequelize.JSON, allowNull: true });
  },

  async down(queryInterface) {
    for (const column of ['unit_floor_plans', 'building_height', 'total_units', 'balconies']) {
      await queryInterface.removeColumn('properties', column).catch(() => {});
    }
  },
};
