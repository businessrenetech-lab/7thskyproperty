'use strict';
// Agency fee income lifecycle: mark our management/letting fees as COLLECTED once
// the owner has been paid out (the fee is netted at disbursement, so it is
// realized then). Enables "collect our fees" reporting + staging for our payout.
module.exports = {
  up: async (q, S) => {
    const d = await q.describeTable('pm_income_entries').catch(() => ({}));
    const add = async (name, spec) => { if (!d[name]) await q.addColumn('pm_income_entries', name, spec); };
    await add('status', { type: S.ENUM('accrued', 'collected'), defaultValue: 'accrued' });
    await add('collected_at', { type: S.DATE, allowNull: true });
    await add('disbursement_id', { type: S.INTEGER, allowNull: true });
  },
  down: async (q) => {
    for (const c of ['status', 'collected_at', 'disbursement_id']) {
      await q.removeColumn('pm_income_entries', c).catch(() => {});
    }
  },
};
