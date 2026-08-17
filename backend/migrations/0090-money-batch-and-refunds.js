'use strict';

/**
 * Migration 0090: batched receipts and client refunds.
 *
 * Two things the ledger could not express.
 *
 * 1. A client who pays one lump sum against four invoices produced four
 *    unrelated receipt rows. Their statement then showed four payments they
 *    never made — they made one. `batch_ref` groups the rows that were one act,
 *    so a statement can say "৳50,000 received on 12 Aug, applied to INV-1..4".
 *
 * 2. There was no way to record giving money BACK. A refund was being confused
 *    with a reversal, and they are not the same: a reversal says the entry was a
 *    mistake and the money never was ours; a refund says the money did arrive
 *    and we returned it. A client's statement has to read differently in the two
 *    cases, and so does the bank reconciliation. `client_refund` is a real
 *    outward movement with its own event type; no schema change is needed for
 *    it beyond the reason column, since event_type is already free.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const D = Sequelize;
    const described = await queryInterface.describeTable('wt_money_events').catch(() => null);
    if (!described) return;

    const columns = {
      // Groups the rows that were one payment. Null for a single-invoice receipt.
      batch_ref: { type: D.STRING(40) },
      // Why money was given back. Kept separate from `reversal_reason` so a
      // refund is never mistaken for a correction when the books are read.
      refund_reason: { type: D.STRING(255) },
    };

    for (const [name, spec] of Object.entries(columns)) {
      if (described[name]) continue;
      await queryInterface.addColumn('wt_money_events', name, spec);
    }

    await queryInterface.addIndex('wt_money_events', ['branch_id', 'batch_ref'], {
      name: 'wt_money_events_batch',
    }).catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('wt_money_events', 'wt_money_events_batch').catch(() => {});
    for (const c of ['batch_ref', 'refund_reason']) {
      await queryInterface.removeColumn('wt_money_events', c).catch(() => {});
    }
  },
};
