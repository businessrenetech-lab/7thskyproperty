'use strict';
// Buyer service Phase D — stage 8 (closure & post-purchase follow-up).
module.exports = {
  up: async (q, S) => {
    const d = await q.describeTable('property_deals').catch(() => ({}));
    const add = async (name, spec) => { if (!d[name]) await q.addColumn('property_deals', name, spec); };
    await add('buyer_feedback', { type: S.TEXT, allowNull: true });
    await add('financial_closure_confirmed', { type: S.BOOLEAN, defaultValue: false });
    await add('closed_at', { type: S.DATE, allowNull: true });
  },
  down: async (q) => {
    for (const c of ['buyer_feedback', 'financial_closure_confirmed', 'closed_at']) {
      await q.removeColumn('property_deals', c).catch(() => {});
    }
  },
};
