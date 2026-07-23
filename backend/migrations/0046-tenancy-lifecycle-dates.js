'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('tenancies');
    if (!table.renewal_effective_date) {
      await queryInterface.addColumn('tenancies', 'renewal_effective_date', { type: Sequelize.DATEONLY, allowNull: true });
    }
    if (!table.planned_move_out_date) {
      await queryInterface.addColumn('tenancies', 'planned_move_out_date', { type: Sequelize.DATEONLY, allowNull: true });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('tenancies');
    if (table.renewal_effective_date) await queryInterface.removeColumn('tenancies', 'renewal_effective_date');
    if (table.planned_move_out_date) await queryInterface.removeColumn('tenancies', 'planned_move_out_date');
  },
};
