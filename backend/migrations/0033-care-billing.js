'use strict';

/**
 * 0033 — Property Care billing automation support.
 * Tracks how much of a work order's provider charge has been paid out (for
 * partial / milestone payouts) and when the client + provider legs settled.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DECIMAL, DATE, BOOLEAN } = Sequelize;
    const qi = queryInterface;
    const addCol = async (c, spec) => { const d = await qi.describeTable('care_work_orders').catch(() => ({})); if (!d[c]) await qi.addColumn('care_work_orders', c, spec); };
    await addCol('provider_paid_amount', { type: DECIMAL(15, 2), defaultValue: 0 });
    await addCol('client_paid_amount', { type: DECIMAL(15, 2), defaultValue: 0 });
    await addCol('income_posted', { type: BOOLEAN, defaultValue: false });
    await addCol('settled_at', { type: DATE });
  },
  async down() { /* additive */ },
};
