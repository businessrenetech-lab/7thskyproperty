'use strict';

// Deposits held per tenancy, by type — SOP Business Rental Management §9. Each
// type is settled separately at exit, which a single security_deposit column on
// the tenancy cannot express.
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const names = tables.map((t) => (typeof t === 'string' ? t : t.tableName));
    if (names.includes('tenancy_deposits')) return;
    await queryInterface.createTable('tenancy_deposits', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: Sequelize.INTEGER, allowNull: false },
      tenancy_id: { type: Sequelize.INTEGER, allowNull: false },
      deposit_type: { type: Sequelize.STRING(40), allowNull: false },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      received_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      received_on: { type: Sequelize.DATEONLY, allowNull: true },
      settled_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      settled_on: { type: Sequelize.DATEONLY, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('tenancy_deposits', ['tenancy_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('tenancy_deposits');
  },
};
