'use strict';

// Commission and operational handover — SOP Business Rental Management §15.
// Nullable throughout: a tenancy with no commission recorded is not gated.
module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('tenancies');
    const add = async (name, type) => {
      if (!t[name]) await queryInterface.addColumn('tenancies', name, { type, allowNull: true });
    };
    await add('commission_amount', Sequelize.DECIMAL(15, 2));
    await add('commission_paid_amount', Sequelize.DECIMAL(15, 2));
    await add('commission_invoice_id', Sequelize.INTEGER);
    await add('handover_completed_at', Sequelize.DATE);
    await add('handover_override_by', Sequelize.INTEGER);
    await add('handover_override_reason', Sequelize.TEXT);
  },
  async down(queryInterface) {
    const t = await queryInterface.describeTable('tenancies');
    for (const c of ['commission_amount', 'commission_paid_amount', 'commission_invoice_id',
      'handover_completed_at', 'handover_override_by', 'handover_override_reason']) {
      if (t[c]) await queryInterface.removeColumn('tenancies', c);
    }
  },
};
