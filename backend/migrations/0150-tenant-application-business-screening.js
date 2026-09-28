'use strict';

// Business tenant screening fields — SOP Business Rental Management §11 /
// Business Tenancy Management §6. Additive and nullable: residential and
// commercial applications are unaffected.
const COLUMNS = {
  business_name: 'STRING',
  business_type: 'STRING',
  intended_activity: 'TEXT',
  trade_licence_no: 'STRING',
  trade_licence_expiry: 'DATEONLY',
  corporate_profile: 'TEXT',
  financial_capability: 'TEXT',
  operational_suitability: 'TEXT',
  previous_leasing_history: 'TEXT',
  screening_notes: 'TEXT',
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('tenant_applications');
    for (const [name, type] of Object.entries(COLUMNS)) {
      if (!t[name]) {
        await queryInterface.addColumn('tenant_applications', name, { type: Sequelize[type], allowNull: true });
      }
    }
    if (!t.screening_verdict) {
      await queryInterface.addColumn('tenant_applications', 'screening_verdict', {
        type: Sequelize.ENUM('pending', 'suitable', 'conditional', 'declined'),
        allowNull: false,
        defaultValue: 'pending',
      });
    }
  },
  async down(queryInterface) {
    const t = await queryInterface.describeTable('tenant_applications');
    for (const name of [...Object.keys(COLUMNS), 'screening_verdict']) {
      if (t[name]) await queryInterface.removeColumn('tenant_applications', name);
    }
  },
};
