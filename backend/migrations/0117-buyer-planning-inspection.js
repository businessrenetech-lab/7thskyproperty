'use strict';
// Buyer service Phase B — stage 2 (requirement assessment & planning) and
// stage 4 (inspection coordination) fields. Additive, guarded.
module.exports = {
  up: async (q, S) => {
    const m = await q.describeTable('buyer_mandates').catch(() => ({}));
    const addM = async (name, spec) => { if (!m[name]) await q.addColumn('buyer_mandates', name, spec); };
    await addM('finance_status', { type: S.ENUM('unknown', 'pre_approved', 'cash', 'pending', 'declined'), defaultValue: 'unknown' });
    await addM('investment_use', { type: S.STRING, allowNull: true });      // owner-occupier / investment
    await addM('risk_notes', { type: S.TEXT, allowNull: true });
    await addM('search_strategy', { type: S.TEXT, allowNull: true });
    await addM('approved_to_proceed', { type: S.BOOLEAN, defaultValue: false });
    await addM('approved_at', { type: S.DATE, allowNull: true });
    await addM('approved_by', { type: S.INTEGER, allowNull: true });

    const c = await q.describeTable('mandate_candidates').catch(() => ({}));
    const addC = async (name, spec) => { if (!c[name]) await q.addColumn('mandate_candidates', name, spec); };
    await addC('viewing_date', { type: S.DATE, allowNull: true });
    await addC('inspection_notes', { type: S.TEXT, allowNull: true });
    await addC('inspection_photos', { type: S.JSON, allowNull: true });     // array of file urls
  },
  down: async (q) => {
    for (const col of ['finance_status', 'investment_use', 'risk_notes', 'search_strategy', 'approved_to_proceed', 'approved_at', 'approved_by']) {
      await q.removeColumn('buyer_mandates', col).catch(() => {});
    }
    for (const col of ['viewing_date', 'inspection_notes', 'inspection_photos']) {
      await q.removeColumn('mandate_candidates', col).catch(() => {});
    }
  },
};
