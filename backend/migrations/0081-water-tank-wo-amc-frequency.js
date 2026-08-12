'use strict';

/**
 * Migration 0081: the AMC billing cycle on the Work Order, and direct quotations.
 *
 * Customer Service Agreement Clause 9 says AMC payment "may be made monthly,
 * quarterly, half-yearly or annually AS SPECIFIED IN THE WORK ORDER" — so the
 * Work Order has to carry that choice. It had the AMC start and expiry dates but
 * nowhere to record the cycle, which left the clause pointing at a field that
 * did not exist.
 *
 * Also flags a quotation raised directly (no site assessment behind it), so the
 * register can tell the two routes apart.
 *
 * Idempotent.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const hasCol = async (t, c) => { try { return !!(await queryInterface.describeTable(t))[c]; } catch { return false; } };
    const add = async (t, c, spec) => { if (!(await hasCol(t, c))) await queryInterface.addColumn(t, c, spec); };

    await add('wt_work_orders', 'amc_payment_frequency', { type: S.STRING(30) });
    await add('wt_work_orders', 'source_quotation_code', { type: S.STRING(30) });

    // Quotation raised without an assessment (Sec. 7 Step 5 straight-to-quote).
    await add('wt_quotations', 'direct_quote', { type: S.BOOLEAN, defaultValue: false });
    await add('wt_quotations', 'client_code', { type: S.STRING(30) });
    await add('wt_quotations', 'site_address', { type: S.STRING(255) });
    await add('wt_quotations', 'work_order_code', { type: S.STRING(30) });
  },

  down: async (queryInterface) => {
    const rm = async (t, c) => { try { await queryInterface.removeColumn(t, c); } catch { /* not present */ } };
    await rm('wt_work_orders', 'amc_payment_frequency');
    await rm('wt_work_orders', 'source_quotation_code');
    for (const c of ['direct_quote', 'client_code', 'site_address', 'work_order_code']) await rm('wt_quotations', c);
  },
};
