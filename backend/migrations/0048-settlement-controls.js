'use strict';
/** Settlement maker-checker controls: submit → independent review → approval →
 *  final lock, with a full audit trail and separation of duties. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('deposit_settlements');

    // Append the two new stages to the status ENUM (append-only, guarded).
    const typeStr = String(t.status?.type || '');
    if (typeStr.toLowerCase().includes('enum') && !typeStr.includes('pending_review')) {
      const members = [...typeStr.matchAll(/'([^']+)'/g)].map((m) => m[1]);
      for (const s of ['pending_review', 'reviewed']) if (!members.includes(s)) members.push(s);
      await queryInterface.changeColumn('deposit_settlements', 'status', {
        type: Sequelize.ENUM(...members), allowNull: t.status.allowNull, defaultValue: t.status.defaultValue || 'computing',
      });
    }

    const add = async (col, spec) => { if (!t[col]) await queryInterface.addColumn('deposit_settlements', col, spec); };
    await add('submitted_by', { type: Sequelize.INTEGER, allowNull: true });
    await add('submitted_at', { type: Sequelize.DATE, allowNull: true });
    await add('reviewed_by', { type: Sequelize.INTEGER, allowNull: true });
    await add('reviewed_at', { type: Sequelize.DATE, allowNull: true });
    await add('review_notes', { type: Sequelize.TEXT, allowNull: true });
    await add('approved_by', { type: Sequelize.INTEGER, allowNull: true });
    await add('approved_at', { type: Sequelize.DATE, allowNull: true });
    await add('locked_by', { type: Sequelize.INTEGER, allowNull: true });
    await add('locked_at', { type: Sequelize.DATE, allowNull: true });
    await add('is_locked', { type: Sequelize.BOOLEAN, defaultValue: false });
    await add('owner_approved', { type: Sequelize.BOOLEAN, defaultValue: false });
    await add('override_reason', { type: Sequelize.TEXT, allowNull: true });

    // Settlements finalised before this migration are already immutable — mark them
    // locked so the flag matches reality, and stamp the lock time from the money date.
    await queryInterface.sequelize.query(
      `UPDATE deposit_settlements
          SET is_locked = true,
              locked_at = COALESCE(locked_at, refunded_at, collected_at, updated_at),
              owner_approved = true
        WHERE status IN ('refunded', 'closed') AND (is_locked = false OR is_locked IS NULL)`,
    );
  },
  async down(queryInterface) {
    for (const c of ['submitted_by', 'submitted_at', 'reviewed_by', 'reviewed_at', 'review_notes',
      'approved_by', 'approved_at', 'locked_by', 'locked_at', 'is_locked', 'owner_approved', 'override_reason']) {
      await queryInterface.removeColumn('deposit_settlements', c).catch(() => {});
    }
  },
};
