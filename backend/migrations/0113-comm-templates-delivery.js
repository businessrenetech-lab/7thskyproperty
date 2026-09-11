'use strict';
// Message templates + persisted delivery status on communications + per-contact
// suppression flags. Additive — existing comms/contacts keep today's behaviour.
module.exports = {
  up: async (q, S) => {
    if (!(await q.describeTable('message_templates').catch(() => null))) {
      await q.createTable('message_templates', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        name: { type: S.STRING, allowNull: false },
        channel: { type: S.ENUM('email', 'sms', 'any'), defaultValue: 'any' },
        scope: { type: S.STRING(40), allowNull: false, defaultValue: 'sales' },
        subject: { type: S.STRING, allowNull: true },
        body: { type: S.TEXT, allowNull: false },
        is_active: { type: S.BOOLEAN, defaultValue: true },
        created_by: { type: S.INTEGER, allowNull: true },
        created_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await q.addIndex('message_templates', ['branch_id', 'scope']);
    }
    const c = await q.describeTable('communications');
    if (!c.delivery_status) await q.addColumn('communications', 'delivery_status', { type: S.ENUM('pending', 'sent', 'simulated', 'failed', 'suppressed', 'logged'), allowNull: true });
    if (!c.provider_message_id) await q.addColumn('communications', 'provider_message_id', { type: S.STRING, allowNull: true });
    if (!c.delivery_error) await q.addColumn('communications', 'delivery_error', { type: S.STRING, allowNull: true });
    if (!c.sent_at) await q.addColumn('communications', 'sent_at', { type: S.DATE, allowNull: true });
    const ct = await q.describeTable('contacts');
    if (!ct.do_not_email) await q.addColumn('contacts', 'do_not_email', { type: S.BOOLEAN, defaultValue: false });
    if (!ct.do_not_sms) await q.addColumn('contacts', 'do_not_sms', { type: S.BOOLEAN, defaultValue: false });
  },
  down: async (q) => {
    await q.dropTable('message_templates').catch(() => {});
    for (const col of ['delivery_status', 'provider_message_id', 'delivery_error', 'sent_at']) await q.removeColumn('communications', col).catch(() => {});
    for (const col of ['do_not_email', 'do_not_sms']) await q.removeColumn('contacts', col).catch(() => {});
  },
};
