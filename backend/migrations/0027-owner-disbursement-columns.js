'use strict';

/**
 * 0027 — reconcile owner_disbursements with the disbursement engine.
 * An older minimal owner_disbursements table already existed (period_start,
 * gross_rent, net_payable…). Add the columns the payout engine records so the
 * owner dashboard reconciles (folio link, before/after balances, method, etc.).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, DECIMAL, DATE, JSON: JSONT } = Sequelize;
    const qi = queryInterface;
    const addCol = async (c, spec) => { const d = await qi.describeTable('owner_disbursements').catch(() => ({})); if (!d[c]) await qi.addColumn('owner_disbursements', c, spec); };

    await addCol('disbursement_code', { type: STRING(40) });
    await addCol('landlord_folio_id', { type: INTEGER });
    await addCol('period_label', { type: STRING(20) });
    await addCol('gross_collected', { type: DECIMAL(15, 2), defaultValue: 0 });
    await addCol('fees_deducted', { type: DECIMAL(15, 2), defaultValue: 0 });
    await addCol('expenses_deducted', { type: DECIMAL(15, 2), defaultValue: 0 });
    await addCol('net_amount', { type: DECIMAL(15, 2), defaultValue: 0 });
    await addCol('balance_before', { type: DECIMAL(15, 2), defaultValue: 0 });
    await addCol('balance_after', { type: DECIMAL(15, 2), defaultValue: 0 });
    await addCol('method', { type: STRING(40), defaultValue: 'bank_transfer' });
    await addCol('reference', { type: STRING });
    await addCol('bank_snapshot', { type: JSONT, defaultValue: null });
    await addCol('folio_txn_id', { type: INTEGER });
    await addCol('statement_id', { type: INTEGER });
  },

  async down() { /* additive only — no destructive down */ },
};
