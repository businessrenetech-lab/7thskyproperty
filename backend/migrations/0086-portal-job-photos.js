'use strict';

/**
 * Migration 0086: photos attached from the provider portal.
 *
 * Completion already accepted photo URLs, which quietly assumed the provider had
 * hosted the pictures somewhere first. In practice that meant nobody attached
 * any and completion evidence went in as prose — which is the weakest possible
 * form of "the work was done", and it is the evidence that releases the
 * provider's own payment.
 *
 * The columns sit on the work order rather than the service report because
 * photos are taken as the job proceeds and the report is filed at the end;
 * waiting for the report to exist would leave the first pictures nowhere to go.
 * The report copies them when it is created, so the filed document is still
 * self-contained.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const described = await queryInterface.describeTable('wt_work_orders').catch(() => null);
    if (!described) return;
    for (const name of ['portal_photos_before', 'portal_photos_after']) {
      if (described[name]) continue;
      await queryInterface.addColumn('wt_work_orders', name, { type: Sequelize.JSON });
    }
  },
  async down(queryInterface) {
    for (const name of ['portal_photos_before', 'portal_photos_after']) {
      await queryInterface.removeColumn('wt_work_orders', name).catch(() => {});
    }
  },
};
