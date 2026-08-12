'use strict';

/**
 * Migration 0078: Water Tank — structured advance payment on quotations.
 *
 * The quotation has always carried `payment_terms` as free text ("50% advance,
 * balance on completion"). Nobody can compute from a sentence, so the advance
 * never reached the Customer Service Agreement and the two documents could state
 * different numbers for the same job. These columns make the advance a figure.
 *
 * The balance is deliberately NOT stored — it is total − advance, and a stored
 * balance is one that eventually disagrees with the total above it.
 *
 * Idempotent.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const hasCol = async (t, c) => { try { return !!(await queryInterface.describeTable(t))[c]; } catch { return false; } };
    const add = async (t, c, spec) => { if (!(await hasCol(t, c))) await queryInterface.addColumn(t, c, spec); };

    await add('wt_quotations', 'advance_percent', { type: S.DECIMAL(5, 2), defaultValue: 0 });
    await add('wt_quotations', 'advance_amount', { type: S.DECIMAL(15, 2), defaultValue: 0 });
    // Which of the two the operator actually set, so the UI can keep the other
    // one following the total instead of freezing a stale figure.
    await add('wt_quotations', 'advance_basis', { type: S.STRING(20), defaultValue: 'percent' });
    // The project the quotation belongs to already exists as project_id; this
    // records the agreement raised from it so the chain is traceable both ways.
    await add('wt_quotations', 'agreement_envelope_id', { type: S.INTEGER });
  },

  down: async (queryInterface) => {
    const rm = async (t, c) => { try { await queryInterface.removeColumn(t, c); } catch { /* not present */ } };
    for (const c of ['advance_percent', 'advance_amount', 'advance_basis', 'agreement_envelope_id']) {
      await rm('wt_quotations', c);
    }
  },
};
