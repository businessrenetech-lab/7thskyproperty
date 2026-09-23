'use strict';

/** Migration 0148: activities record why the authority rejected a submission
 *  (name rejection is a named SOP risk and feeds the Risk dashboard). */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const t = await queryInterface.describeTable('business_registration_activities');
    if (!t.rejection_reason) {
      await queryInterface.addColumn('business_registration_activities', 'rejection_reason', { type: Sequelize.TEXT, allowNull: true });
    }
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('business_registration_activities', 'rejection_reason').catch(() => {});
  },
};
