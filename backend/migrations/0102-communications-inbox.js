'use strict';

/**
 * Migration 0102: Communication Inbox — two additive columns on `communications`
 * so the admin unified inbox has a well-defined "unread" without overloading the
 * existing status ENUM, and can hold drafts (the status ENUM has no 'draft' value).
 *   read_at  — when an inbound message was read by staff (NULL = unread).
 *   is_draft — a composed-but-unsent outbound message.
 * Additive and idempotent; logs a skipped addColumn rather than swallowing it.
 */
module.exports = {
  up: async (q, S) => {
    const desc = await q.describeTable('communications').catch(() => null);
    if (!desc) return;
    const cols = {
      read_at: { type: S.DATE, allowNull: true },
      is_draft: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
    };
    for (const [col, def] of Object.entries(cols)) {
      if (!desc[col]) {
        await q.addColumn('communications', col, def)
          .catch((e) => console.warn(`[0102] addColumn communications.${col} skipped:`, e.message));
      }
    }
  },
  down: async (q) => {
    for (const col of ['read_at', 'is_draft']) await q.removeColumn('communications', col).catch(() => {});
  },
};
