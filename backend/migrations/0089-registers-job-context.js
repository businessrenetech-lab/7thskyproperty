'use strict';

/**
 * Migration 0089: warranties, complaints and incidents know their job.
 *
 * All three registers had the same defect the service report had: client, work
 * order and project were FREE TEXT, and there was no property field at all. A
 * warranty could cover a client who was not the client on the job it was raised
 * from; an incident could cite a work order that did not exist.
 *
 * These carry the RESOLVED context, written server-side from the work order.
 *
 * `raised_via` and `logged_by` answer the other half of the request: a complaint
 * may be logged by Seventh Sky staff OR arrive from the customer through their
 * portal, and the register has to show which. Until now a customer complaint
 * went only to the communication log and never became a complaint at all, so it
 * never appeared on this screen.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const D = Sequelize;

    const shared = {
      work_order_id: { type: D.INTEGER },
      client_code: { type: D.STRING(30) },
      site_address: { type: D.STRING(255) },
      // 'staff' | 'client' | 'provider' — who raised it, not who it is about.
      raised_via: { type: D.STRING(20), defaultValue: 'staff' },
      logged_by: { type: D.STRING(120) },
    };

    for (const table of ['wt_warranties', 'wt_complaints', 'wt_incidents']) {
      const described = await queryInterface.describeTable(table).catch(() => null);
      if (!described) continue;

      const columns = { ...shared };
      // The complaint register had nowhere to put the actual complaint text —
      // only a "disclosure" field and a severity. A complaint without the words
      // the client used is not much of a record.
      if (table === 'wt_complaints') {
        columns.details = { type: D.TEXT };
        columns.resolution = { type: D.TEXT };
        columns.project_id = { type: D.STRING(30) };
        columns.work_order_code = { type: D.STRING(30) };
        columns.provider_name = { type: D.STRING(160) };
      }

      for (const [name, spec] of Object.entries(columns)) {
        if (described[name]) continue;
        await queryInterface.addColumn(table, name, spec);
      }
      await queryInterface.addIndex(table, ['branch_id', 'work_order_code'], {
        name: `${table}_wo`,
      }).catch(() => {});
    }
  },

  async down(queryInterface) {
    for (const table of ['wt_warranties', 'wt_complaints', 'wt_incidents']) {
      for (const c of ['work_order_id', 'client_code', 'site_address', 'raised_via', 'logged_by',
        'details', 'resolution', 'project_id', 'work_order_code', 'provider_name']) {
        await queryInterface.removeColumn(table, c).catch(() => {});
      }
    }
  },
};
