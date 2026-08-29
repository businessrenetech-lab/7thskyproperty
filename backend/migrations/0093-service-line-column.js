'use strict';

/**
 * Migration 0093: add `service_line` to every shared service-module table.
 *
 * The Water Tank tables now carry data for multiple service lines (Water Tank,
 * Air Conditioning, …). `service_line` tags each row with its owning service so
 * one codebase can serve them all, scoped by branch_id + service_line.
 *
 * Additive and idempotent: adds the column (default 'water_tank', so every
 * existing row is Water Tank) and a (branch_id, service_line) index. Nothing is
 * dropped in the up path.
 */
const TABLES = [
  'wt_clients', 'wt_service_requests', 'wt_enquiries', 'wt_site_assessments',
  'wt_quotations', 'wt_work_orders', 'wt_projects', 'wt_project_disbursements',
  'wt_providers', 'wt_provider_documents', 'wt_provider_agreements',
  'wt_provider_agreement_rates', 'wt_provider_audits', 'wt_provider_events',
  'wt_amc_contracts', 'wt_amc_visits', 'wt_invoices', 'wt_complaints',
  'wt_warranties', 'wt_incidents', 'wt_client_events', 'wt_comm_logs',
  'wt_money_events', 'wt_record_comments', 'wt_service_reports', 'wt_protected_clients',
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const table of TABLES) {
      const described = await queryInterface.describeTable(table).catch(() => null);
      if (!described) continue;
      if (!described.service_line) {
        await queryInterface.addColumn(table, 'service_line', {
          type: Sequelize.STRING(40), allowNull: false, defaultValue: 'water_tank',
        });
        await queryInterface.addIndex(table, ['branch_id', 'service_line'], {
          name: `${table}_service_line`,
        }).catch(() => {});
      }
    }
  },

  down: async (queryInterface) => {
    for (const table of TABLES) {
      await queryInterface.removeIndex(table, `${table}_service_line`).catch(() => {});
      await queryInterface.removeColumn(table, 'service_line').catch(() => {});
    }
  },
};
