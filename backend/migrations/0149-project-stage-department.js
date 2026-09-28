'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('project_stages');
    if (!t.department) {
      await queryInterface.addColumn('project_stages', 'department', { type: Sequelize.STRING(80), allowNull: true });
    }
    if (!t.escalation_trigger) {
      await queryInterface.addColumn('project_stages', 'escalation_trigger', { type: Sequelize.STRING(255), allowNull: true });
    }
  },
  async down(queryInterface) {
    const t = await queryInterface.describeTable('project_stages');
    if (t.department) await queryInterface.removeColumn('project_stages', 'department');
    if (t.escalation_trigger) await queryInterface.removeColumn('project_stages', 'escalation_trigger');
  },
};
