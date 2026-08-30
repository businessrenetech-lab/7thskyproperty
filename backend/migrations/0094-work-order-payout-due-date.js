'use strict';

/**
 * Migration 0094: add `provider_payout_due_date` to wt_work_orders.
 *
 * The signed provider agreement's `payment_due_days` sets how long after a payout
 * falls due (per its payout_trigger) Seventh Sky has to pay the provider. That
 * deadline is cached here so lists and alerts can flag overdue payouts without
 * recomputing the agreement each time. Additive and idempotent; nullable.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const described = await queryInterface.describeTable('wt_work_orders').catch(() => null);
    if (described && !described.provider_payout_due_date) {
      await queryInterface.addColumn('wt_work_orders', 'provider_payout_due_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('wt_work_orders', 'provider_payout_due_date').catch(() => {});
  },
};
