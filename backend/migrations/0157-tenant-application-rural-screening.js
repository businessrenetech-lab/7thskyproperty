'use strict';

// Rural tenant screening — SOP Rural Rental Management §10 Step 11 / CRM Owner
// Sheet 8. Additive and nullable. `screening_notes` and `screening_verdict`
// already exist from 0150 and are shared with business screening.
const COLUMNS = {
  nid_verified: 'STRING',
  business_verification: 'TEXT',
  farming_experience: 'TEXT',
  financial_capacity: 'TEXT',
  references_verified: 'TEXT',
  background_check: 'TEXT',
  intended_use: 'TEXT',
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('tenant_applications');
    for (const [name, type] of Object.entries(COLUMNS)) {
      if (!t[name]) {
        await queryInterface.addColumn('tenant_applications', name, { type: Sequelize[type], allowNull: true });
      }
    }
  },
  async down(queryInterface) {
    const t = await queryInterface.describeTable('tenant_applications');
    for (const name of Object.keys(COLUMNS)) {
      if (t[name]) await queryInterface.removeColumn('tenant_applications', name);
    }
  },
};
