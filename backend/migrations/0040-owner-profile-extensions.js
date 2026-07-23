'use strict';
/** Owner-profile extensions for the landlord management agreement:
 *  repair budget cap, termination notice, agreement commercials, joint second owner. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('property_owner_profiles');
    const add = async (col, spec) => { if (!t[col]) await queryInterface.addColumn('property_owner_profiles', col, spec); };
    await add('repair_budget_max', { type: Sequelize.DECIMAL(15, 2), allowNull: true });
    await add('termination_notice_days', { type: Sequelize.INTEGER, allowNull: true });
    await add('security_money_amount', { type: Sequelize.DECIMAL(15, 2), allowNull: true });
    await add('advance_rent_amount', { type: Sequelize.DECIMAL(15, 2), allowNull: true });
    await add('service_charge_amount', { type: Sequelize.DECIMAL(15, 2), allowNull: true });
    await add('agreement_start_date', { type: Sequelize.DATEONLY, allowNull: true });
    await add('joint_owner_name', { type: Sequelize.STRING, allowNull: true });
    await add('joint_owner_phone', { type: Sequelize.STRING(40), allowNull: true });
    await add('joint_owner_email', { type: Sequelize.STRING, allowNull: true });
    await add('joint_owner_nid', { type: Sequelize.STRING(40), allowNull: true });
    await add('joint_owner_address', { type: Sequelize.TEXT, allowNull: true });
  },
  async down(queryInterface) {
    for (const col of ['repair_budget_max', 'termination_notice_days', 'security_money_amount', 'advance_rent_amount',
      'service_charge_amount', 'agreement_start_date', 'joint_owner_name', 'joint_owner_phone', 'joint_owner_email',
      'joint_owner_nid', 'joint_owner_address']) {
      await queryInterface.removeColumn('property_owner_profiles', col).catch(() => {});
    }
  },
};
