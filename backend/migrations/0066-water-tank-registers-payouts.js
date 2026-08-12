'use strict';

/**
 * Migration 0066: Water Tank — registers + provider payout tracking.
 *
 * Moves "Payments & Disbursements" and "Warranty & Issues" out of the shared
 * Property Care module and into the Water Tank service line with their own data:
 *   - wt_warranties / wt_incidents  → the Registers screen
 *   - payout columns on wt_work_orders → the Payments screen (partial payouts)
 * Idempotent.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const has = async (t) => { try { await queryInterface.describeTable(t); return true; } catch { return false; } };
    const hasCol = async (t, c) => { try { return !!(await queryInterface.describeTable(t))[c]; } catch { return false; } };
    const ts = () => ({
      createdAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
    const base = () => ({ id: { type: S.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 } });

    // ── warranties on completed water-tank work ──
    if (!(await has('wt_warranties'))) await queryInterface.createTable('wt_warranties', {
      ...base(),
      code: { type: S.STRING(30), allowNull: false, unique: true },
      client_name: { type: S.STRING(200), allowNull: false },
      project_id: S.STRING(30),
      work_order_code: S.STRING(30),
      warranty_type: S.STRING(120),
      coverage: S.TEXT,
      start_date: S.DATEONLY,
      expiry_date: S.DATEONLY,
      status: { type: S.STRING(30), defaultValue: 'Active' },
      provider_name: S.STRING(160),
      terms: S.TEXT,
      claim_notes: S.TEXT,
      ...ts(),
    });

    // ── safety / service incidents ──
    if (!(await has('wt_incidents'))) await queryInterface.createTable('wt_incidents', {
      ...base(),
      code: { type: S.STRING(30), allowNull: false, unique: true },
      client_name: S.STRING(200),
      project_id: S.STRING(30),
      work_order_code: S.STRING(30),
      incident_type: { type: S.STRING(60), defaultValue: 'Other' },
      severity: { type: S.STRING(20), defaultValue: 'Medium' },
      incident_date: S.DATEONLY,
      location: S.STRING(200),
      provider_name: S.STRING(160),
      reported_by: S.STRING(120),
      description: S.TEXT,
      action_taken: S.TEXT,
      status: { type: S.STRING(30), defaultValue: 'Open' },
      ...ts(),
    });

    // ── provider payout tracking on work orders ──
    const payoutCols = {
      provider_paid_amount: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      payout_status: { type: S.STRING(30), defaultValue: 'Not Due' },
      payout_date: S.DATEONLY,
      payout_method: S.STRING(40),
      payout_reference: S.STRING(80),
    };
    for (const [col, spec] of Object.entries(payoutCols)) {
      if (!(await hasCol('wt_work_orders', col))) await queryInterface.addColumn('wt_work_orders', col, spec);
    }

    // ── client payment tracking on invoices ──
    if (!(await hasCol('wt_invoices', 'paid_amount'))) await queryInterface.addColumn('wt_invoices', 'paid_amount', { type: S.DECIMAL(15, 2), defaultValue: 0 });
    if (!(await hasCol('wt_invoices', 'payments'))) await queryInterface.addColumn('wt_invoices', 'payments', { type: S.JSON });
  },

  down: async (queryInterface) => {
    const drop = async (t) => { try { await queryInterface.dropTable(t); } catch { /* not present */ } };
    const rm = async (t, c) => { try { await queryInterface.removeColumn(t, c); } catch { /* not present */ } };
    await drop('wt_warranties');
    await drop('wt_incidents');
    for (const c of ['provider_paid_amount', 'payout_status', 'payout_date', 'payout_method', 'payout_reference']) await rm('wt_work_orders', c);
    for (const c of ['paid_amount', 'payments']) await rm('wt_invoices', c);
  },
};
