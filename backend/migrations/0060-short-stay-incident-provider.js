'use strict';

/**
 * Migration 0060: add assigned_provider_id to short_stay_incidents.
 * Lets an incident be assigned to a service provider (mirrors housekeeping tasks),
 * powering the Maintenance screen's "Assign provider" action. Idempotent.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('short_stay_incidents');
    if (!table.assigned_provider_id) {
      await queryInterface.addColumn('short_stay_incidents', 'assigned_provider_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('short_stay_incidents');
    if (table.assigned_provider_id) {
      await queryInterface.removeColumn('short_stay_incidents', 'assigned_provider_id');
    }
  },
};
