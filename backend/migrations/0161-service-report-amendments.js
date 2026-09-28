'use strict';

/**
 * Let a provider amend a report they already filed, without losing what it said.
 *
 * A `wt_service_reports` row was written once, when the job was completed, and
 * the provider portal had no update path of any kind — a wrong reading or a
 * missing finding was permanent, and the only remedy was to phone the office.
 *
 * An amendment is evidence, so it cannot be a silent overwrite. These columns
 * keep the trail beside the record: when it was last amended, by whom, and the
 * full history of what each amendment changed.
 *
 * `amendment_history` is JSON — a list of
 *   { at, by, by_type, changes: { field: { from, to } }, note }
 * newest last, so the original submission is always recoverable by replaying it.
 *
 * Additive, guarded and re-runnable.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('wt_service_reports');

    if (!t.amended_at) {
      await queryInterface.addColumn('wt_service_reports', 'amended_at', {
        type: Sequelize.DATE, allowNull: true,
      });
    }
    if (!t.amended_by) {
      await queryInterface.addColumn('wt_service_reports', 'amended_by', {
        type: Sequelize.STRING(200), allowNull: true,
        comment: 'Who last amended it — the provider business name, or a staff member',
      });
    }
    if (!t.amendment_count) {
      await queryInterface.addColumn('wt_service_reports', 'amendment_count', {
        type: Sequelize.INTEGER, allowNull: false, defaultValue: 0,
      });
    }
    if (!t.amendment_history) {
      await queryInterface.addColumn('wt_service_reports', 'amendment_history', {
        type: Sequelize.JSON, allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const t = await queryInterface.describeTable('wt_service_reports');
    for (const col of ['amendment_history', 'amendment_count', 'amended_by', 'amended_at']) {
      if (t[col]) await queryInterface.removeColumn('wt_service_reports', col);
    }
  },
};
