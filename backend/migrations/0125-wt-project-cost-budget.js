'use strict';
// Per-project internal cost budget/estimate by category (JSON: { category: amount }),
// so the cost sheet can show budget vs actual. Optional; null = no budget set.
module.exports = {
  up: async (q, S) => {
    const d = await q.describeTable('wt_projects').catch(() => ({}));
    if (!d.cost_budget) await q.addColumn('wt_projects', 'cost_budget', { type: S.JSON, allowNull: true });
  },
  down: async (q) => { await q.removeColumn('wt_projects', 'cost_budget').catch(() => {}); },
};
