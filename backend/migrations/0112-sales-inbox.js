'use strict';
// Sales inbox: explicit thread participants + per-message visibility + per-thread
// assignment. Additive — existing comms default to client/unassigned (today's
// behaviour); rental inbox unaffected.
module.exports = {
  up: async (q, S) => {
    if (!(await q.describeTable('comm_participants').catch(() => null))) {
      await q.createTable('comm_participants', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        thread_key: { type: S.STRING(80), allowNull: false },
        contact_id: { type: S.INTEGER, allowNull: true },
        user_id: { type: S.INTEGER, allowNull: true },
        role: { type: S.STRING(40), allowNull: true },
        added_by: { type: S.INTEGER, allowNull: true },
        created_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await q.addIndex('comm_participants', ['branch_id', 'thread_key']);
    }
    const t = await q.describeTable('communications');
    if (!t.visibility) await q.addColumn('communications', 'visibility', { type: S.ENUM('internal', 'client'), allowNull: false, defaultValue: 'client' });
    if (!t.assigned_to) await q.addColumn('communications', 'assigned_to', { type: S.INTEGER, allowNull: true });
  },
  down: async (q) => {
    await q.dropTable('comm_participants').catch(() => {});
    await q.removeColumn('communications', 'visibility').catch(() => {});
    await q.removeColumn('communications', 'assigned_to').catch(() => {});
  },
};
