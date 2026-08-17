'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('short_stay_bookings');
    const additions = {
      cancellation_reason: { type: Sequelize.TEXT, allowNull: true },
      cancelled_at: { type: Sequelize.DATE, allowNull: true },
      refund_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      deposit_refunded_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      checkin_notes: { type: Sequelize.TEXT, allowNull: true },
      checkout_notes: { type: Sequelize.TEXT, allowNull: true },
    };
    for (const [column, definition] of Object.entries(additions)) {
      if (!table[column]) await queryInterface.addColumn('short_stay_bookings', column, definition);
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('short_stay_bookings');
    for (const column of ['checkout_notes', 'checkin_notes', 'deposit_refunded_amount', 'refund_amount', 'cancelled_at', 'cancellation_reason']) {
      if (table[column]) await queryInterface.removeColumn('short_stay_bookings', column);
    }
  },
};
