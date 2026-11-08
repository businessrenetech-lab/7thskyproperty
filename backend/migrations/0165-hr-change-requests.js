'use strict';

/**
 * HRM change requests and history (plan Task 3).
 *
 * hr_change_requests holds every change that needs approval (M1 §6, M2 §9, M3 §5): what changes (payload),
 * the values before, and the approval chain with who decided each step, when and why.
 * hr_history is the permanent log (M2 §6 "No old record should be deleted"); it has no update or delete route.
 *
 * Safe to re-run: each table is created only when missing.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = new Set((await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName)));
    const D = Sequelize;
    const ref = (table) => ({ type: D.INTEGER, allowNull: true, references: { model: table, key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' });

    if (!existing.has('hr_change_requests')) {
      await queryInterface.createTable('hr_change_requests', {
        id: { type: D.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        branch_id: ref('branches'),
        code: { type: D.STRING(30), allowNull: false, unique: true },
        kind: { type: D.STRING(40), allowNull: false },
        entity_type: { type: D.STRING(40), allowNull: false },
        entity_id: { type: D.INTEGER, allowNull: true },
        payload: D.JSON,
        before: D.JSON,
        reason: D.TEXT,
        chain: D.JSON,
        step: { type: D.INTEGER, allowNull: false, defaultValue: 0 },
        status: { type: D.STRING(20), allowNull: false, defaultValue: 'pending' },
        requested_by: ref('users'),
        created_at: { type: D.DATE, allowNull: false, defaultValue: D.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: D.DATE, allowNull: false, defaultValue: D.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('hr_change_requests', ['status'], { name: 'hr_change_requests_status' });
      await queryInterface.addIndex('hr_change_requests', ['entity_type', 'entity_id'], { name: 'hr_change_requests_entity' });
      await queryInterface.addIndex('hr_change_requests', ['requested_by'], { name: 'hr_change_requests_requested_by' });
    }

    if (!existing.has('hr_history')) {
      await queryInterface.createTable('hr_history', {
        id: { type: D.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        branch_id: ref('branches'),
        entity_type: { type: D.STRING(40), allowNull: false },
        entity_id: { type: D.INTEGER, allowNull: false },
        field: { type: D.STRING(80), allowNull: false },
        old_value: D.TEXT,
        new_value: D.TEXT,
        change_request_id: ref('hr_change_requests'),
        actor_id: ref('users'),
        at: { type: D.DATE, allowNull: false, defaultValue: D.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('hr_history', ['entity_type', 'entity_id'], { name: 'hr_history_entity' });
      await queryInterface.addIndex('hr_history', ['at'], { name: 'hr_history_at' });
    }
  },

  async down() {
    // History is never dropped by a rollback (M2 §6).
  },
};
