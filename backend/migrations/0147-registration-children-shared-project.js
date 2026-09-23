'use strict';

/**
 * Migration 0147: registration parties, activities and assessments hang off the
 * SHARED service-line project (wt_projects) now that Business Registration runs on
 * the shared core. The legacy project_id (business_registration_projects) is left in
 * place — it still carries the handful of pre-migration rows.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = [
      'business_registration_parties',
      'business_registration_activities',
      'business_registration_assessments',
    ];
    for (const table of tables) {
      const t = await queryInterface.describeTable(table);
      if (!t.wt_project_id) {
        await queryInterface.addColumn(table, 'wt_project_id', { type: Sequelize.INTEGER, allowNull: true });
        await queryInterface.addIndex(table, ['wt_project_id'], { name: `${table}_wt_project_id` });
      }
      if (t.project_id && t.project_id.allowNull === false) {
        await queryInterface.changeColumn(table, 'project_id', { type: Sequelize.INTEGER, allowNull: true });
      }
    }
  },
  down: async (queryInterface) => {
    for (const table of ['business_registration_parties', 'business_registration_activities', 'business_registration_assessments']) {
      await queryInterface.removeIndex(table, `${table}_wt_project_id`).catch(() => {});
      await queryInterface.removeColumn(table, 'wt_project_id').catch(() => {});
    }
  },
};
