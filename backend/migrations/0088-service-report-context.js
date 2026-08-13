'use strict';

/**
 * Migration 0088: service reports know which job they belong to, and who filed them.
 *
 * The report form asked for client, work order and dates as FREE TEXT, and had no
 * field for the project or the property at all. So a report could name a client
 * who is not the client on the work order, cite a work order that does not exist,
 * and belong to no project — and nothing would object. Reports are the evidence
 * that releases a provider's payment, so evidence that cannot be tied to the job
 * it describes is close to useless.
 *
 * Every one of those facts already exists on the work order. These columns hold
 * the RESOLVED context, written server-side from the work order rather than typed,
 * so a report and its job can never disagree.
 *
 * `filed_by` / `filed_via` answer the other half of the request: a team member can
 * log a report on a provider's behalf, and the record has to show that it was
 * filed by staff rather than submitted by the provider themselves. Those are
 * different things when a dispute arrives.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const D = Sequelize;
    const described = await queryInterface.describeTable('wt_service_reports').catch(() => null);
    if (!described) return;

    const columns = {
      work_order_id: { type: D.INTEGER },
      client_code: { type: D.STRING(30) },
      site_address: { type: D.STRING(255) },
      service_category: { type: D.STRING(120) },
      // 'provider' = submitted through the portal; 'staff' = logged on their behalf.
      filed_via: { type: D.STRING(20), defaultValue: 'staff' },
      filed_by: { type: D.STRING(120) },
    };
    for (const [name, spec] of Object.entries(columns)) {
      if (described[name]) continue;
      await queryInterface.addColumn('wt_service_reports', name, spec);
    }
    await queryInterface.addIndex('wt_service_reports', ['branch_id', 'work_order_code'], {
      name: 'wt_service_reports_wo',
    }).catch(() => {});
  },

  async down(queryInterface) {
    for (const c of ['work_order_id', 'client_code', 'site_address', 'service_category', 'filed_via', 'filed_by']) {
      await queryInterface.removeColumn('wt_service_reports', c).catch(() => {});
    }
  },
};
