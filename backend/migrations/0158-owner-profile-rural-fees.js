'use strict';

// The rural fee structure (SOP Rural Rental Management §7 Step 6). Only the four
// fields property_owner_profiles does not already have: management_commission,
// onboarding_fee, agreement_start_date and termination_notice_days are reused.
module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('property_owner_profiles');
    const add = async (name, type) => {
      if (!t[name]) await queryInterface.addColumn('property_owner_profiles', name, { type, allowNull: true });
    };
    await add('leasing_fee', Sequelize.DECIMAL(15, 2));
    await add('marketing_budget', Sequelize.DECIMAL(15, 2));
    await add('early_termination_fee', Sequelize.DECIMAL(15, 2));
    await add('exclusive_until', Sequelize.DATEONLY);
  },
  async down(queryInterface) {
    const t = await queryInterface.describeTable('property_owner_profiles');
    for (const c of ['leasing_fee', 'marketing_budget', 'early_termination_fee', 'exclusive_until']) {
      if (t[c]) await queryInterface.removeColumn('property_owner_profiles', c);
    }
  },
};
