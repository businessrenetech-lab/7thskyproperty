'use strict';
// Link a drafted agency-fee invoice back to the signing envelope that produced
// it — the once-only key for signing→billing, and a reporting handle.
module.exports = {
  up: async (q, S) => {
    const t = await q.describeTable('invoices');
    if (!t.agreement_envelope_id) await q.addColumn('invoices', 'agreement_envelope_id', { type: S.INTEGER, allowNull: true });
    await q.addIndex('invoices', ['agreement_envelope_id']).catch(() => {});
  },
  down: async (q) => { await q.removeColumn('invoices', 'agreement_envelope_id').catch(() => {}); },
};
