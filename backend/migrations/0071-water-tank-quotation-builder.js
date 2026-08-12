'use strict';

/**
 * Migration 0071: quotation builder fields.
 * A quotation now carries its own fee/discount lines, the assessment it came
 * from, client-facing terms, and a record of when it was emailed.
 * Idempotent.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const hasCol = async (t, c) => { try { return !!(await queryInterface.describeTable(t))[c]; } catch { return false; } };
    const cols = {
      source_assessment: S.STRING(30),
      other_fees: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      discount: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      vat_exempt: { type: S.BOOLEAN, defaultValue: false },
      payment_terms: S.TEXT,
      notes: S.TEXT,
      sent_at: S.DATE,
      sent_to: S.STRING(160),
      agreement_envelope_id: S.INTEGER,
      agreement_code: S.STRING(40),
    };
    for (const [col, spec] of Object.entries(cols)) {
      if (!(await hasCol('wt_quotations', col))) await queryInterface.addColumn('wt_quotations', col, spec);
    }
  },
  down: async (queryInterface) => {
    for (const c of ['source_assessment', 'other_fees', 'discount', 'vat_exempt', 'payment_terms',
      'notes', 'sent_at', 'sent_to', 'agreement_envelope_id', 'agreement_code']) {
      try { await queryInterface.removeColumn('wt_quotations', c); } catch { /* not present */ }
    }
  },
};
