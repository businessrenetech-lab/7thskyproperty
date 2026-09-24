'use strict';

// Business lease structure — SOP Rental §9 / Tenancy §9. All nullable: existing
// residential and commercial tenancies are untouched and read as "not recorded".
module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('tenancies');
    const add = async (name, type) => {
      if (!t[name]) await queryInterface.addColumn('tenancies', name, { type, allowNull: true });
    };
    await add('lease_term_months', Sequelize.INTEGER);
    await add('extension_option', Sequelize.STRING(20));
    await add('renewal_increment_pct', Sequelize.DECIMAL(5, 2));
    await add('advance_months', Sequelize.INTEGER);
    await add('advance_received', Sequelize.DECIMAL(15, 2));
    await add('structure_warnings', Sequelize.JSON);
    await add('structure_override_by', Sequelize.INTEGER);
    await add('structure_override_reason', Sequelize.TEXT);
  },
  async down(queryInterface) {
    const t = await queryInterface.describeTable('tenancies');
    for (const c of ['lease_term_months', 'extension_option', 'renewal_increment_pct', 'advance_months',
      'advance_received', 'structure_warnings', 'structure_override_by', 'structure_override_reason']) {
      if (t[c]) await queryInterface.removeColumn('tenancies', c);
    }
  },
};
