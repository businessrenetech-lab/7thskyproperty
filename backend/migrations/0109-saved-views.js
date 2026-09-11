'use strict';
// Per-user saved filter presets ("saved views") for the Deals board, Work Queue
// and other list screens. params is opaque JSON owned by the client.
module.exports = {
  up: async (q, S) => {
    if (await q.describeTable('saved_views').catch(() => null)) return;
    await q.createTable('saved_views', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: S.INTEGER, allowNull: false },
      user_id: { type: S.INTEGER, allowNull: false },
      scope: { type: S.STRING(40), allowNull: false },
      name: { type: S.STRING, allowNull: false },
      params: { type: S.JSON, allowNull: false, defaultValue: {} },
      created_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
    await q.addIndex('saved_views', ['branch_id', 'user_id', 'scope']);
  },
  down: async (q) => { await q.dropTable('saved_views').catch(() => {}); },
};
