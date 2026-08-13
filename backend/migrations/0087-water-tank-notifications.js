'use strict';

/**
 * Migration 0087: a real log of what was notified.
 *
 * The first version of the notification service de-duplicated by writing the
 * event key into `wt_comm_log.ref_code` and looking it up before sending. Two
 * things were wrong with that, and the tests caught both:
 *
 *   1. `ref_code` is VARCHAR(30) and the keys are longer —
 *      "payment_received:INV-0501:4000" is already 30, and most are more. MySQL
 *      truncated silently, so the stored value never matched the full key on
 *      lookup and the de-duplication NEVER WORKED. Every sweep would have
 *      emailed the same client about the same overdue invoice again.
 *
 *   2. Even with room, SELECT-then-INSERT is a race: two sweeps running together
 *      both find nothing and both send.
 *
 * So the key gets its own table with a UNIQUE INDEX, and the insert itself is
 * the claim — if it collides, someone else already sent it. That is the same
 * reasoning as the money ledger's idempotency key, and for the same reason: the
 * cost of getting it wrong is paid by the client, in their inbox.
 *
 * The human-readable line still goes to wt_comm_log so a notification appears on
 * the client's file beside the phone calls; this table is the machinery.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const D = Sequelize;
    const existing = await queryInterface.describeTable('wt_notifications').catch(() => null);
    if (existing) return;

    await queryInterface.createTable('wt_notifications', {
      id: { type: D.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: D.INTEGER, allowNull: false, defaultValue: 1 },
      // Long enough for any key this module builds, with room to spare.
      event_key: { type: D.STRING(191), allowNull: false },
      recipient: { type: D.STRING(160) },
      subject: { type: D.STRING(255) },
      ref_type: { type: D.STRING(40) },
      status: { type: D.STRING(20), allowNull: false, defaultValue: 'sent' },
      error: { type: D.STRING(255) },
      sent_at: { type: D.DATE, allowNull: false, defaultValue: D.literal('CURRENT_TIMESTAMP') },
    });

    /*
     * 191 rather than 255: on utf8mb4 an index key is limited to 767 bytes on
     * older InnoDB row formats, and 191 × 4 bytes is the well-known ceiling that
     * fits everywhere. Being portable matters more here than the extra length.
     */
    await queryInterface.addIndex('wt_notifications', ['branch_id', 'event_key'], {
      unique: true, name: 'wt_notifications_key',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('wt_notifications').catch(() => {});
  },
};
