'use strict';
// Variation approval lifecycle: link the auto-drafted invoice raised when a
// variation is approved, and record when it was sent to the client for approval.
module.exports = {
  up: async (q, S) => {
    const d = await q.describeTable('interior_variations').catch(() => ({}));
    const add = async (name, spec) => { if (!d[name]) await q.addColumn('interior_variations', name, spec); };
    await add('invoice_code', { type: S.STRING(30), allowNull: true });
    await add('sent_at', { type: S.DATE, allowNull: true });
  },
  down: async (q) => {
    for (const c of ['invoice_code', 'sent_at']) await q.removeColumn('interior_variations', c).catch(() => {});
  },
};
