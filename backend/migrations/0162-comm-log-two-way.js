'use strict';

/**
 * Make the portal message channel two-way, and make a thread identifiable.
 *
 * Three faults this fixes, all measured before it was written:
 *
 * 1. EVERY `channel: 'portal'` row in the codebase is `direction: 'inbound'`.
 *    Nothing could write a reply, so a contractor messaged the operations desk
 *    and could not be answered in the portal. Staff replied by phone or WhatsApp
 *    and the thread died. `author` records who at Seventh Sky sent a reply.
 *
 * 2. A provider's thread was matched by `client_name = provider.business_name` —
 *    string equality on a business name. Rename the business and the thread
 *    orphans. `provider_id` and `party_type` give a row a real owner.
 *
 * 3. A provider's own work-order actions were logged under the CLIENT's name,
 *    because the row is about the client's job. That is right for the job and
 *    wrong for the person: of 13 portal/inbound rows, 0 had ref_type 'providers',
 *    so "show me everything this contractor said" was unanswerable. `provider_id`
 *    is set alongside `client_name` rather than replacing it, so both readings work.
 *
 * `body` is added because the portal truncated messages into `summary` at 500
 * characters — fine as a list preview, lossy as the message itself.
 *
 * The two read stamps are per side: a provider needs to see that the desk
 * replied, and the desk needs to see which messages are still unanswered.
 * NULL means unread, which is the correct default for every existing row —
 * nothing is retroactively marked as seen.
 *
 * Additive, guarded and re-runnable.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('wt_comm_logs');

    const add = async (name, spec) => {
      if (!t[name]) await queryInterface.addColumn('wt_comm_logs', name, spec);
    };

    await add('provider_id', {
      type: Sequelize.INTEGER, allowNull: true,
      comment: 'The provider this row belongs to; set alongside client_name, not instead of it',
    });
    await add('party_type', {
      type: Sequelize.STRING(20), allowNull: true,
      comment: "'provider' | 'client' — who the portal thread is with",
    });
    await add('body', { type: Sequelize.TEXT, allowNull: true });
    await add('author', {
      type: Sequelize.STRING(120), allowNull: true,
      comment: 'Who at Seventh Sky sent an outbound reply',
    });
    await add('read_by_staff_at', { type: Sequelize.DATE, allowNull: true });
    await add('read_by_party_at', { type: Sequelize.DATE, allowNull: true });

    const idx = async (name, fields) => {
      const [rows] = await queryInterface.sequelize.query(
        `SHOW INDEX FROM wt_comm_logs WHERE Key_name = '${name}'`,
      );
      if (!rows.length) await queryInterface.addIndex('wt_comm_logs', fields, { name });
    };
    await idx('wt_comm_logs_provider_id', ['provider_id']);
    // The unanswered-message query: portal rows, one direction, still unread.
    await idx('wt_comm_logs_channel_direction', ['channel', 'direction']);
  },

  async down(queryInterface) {
    const t = await queryInterface.describeTable('wt_comm_logs');
    for (const name of ['wt_comm_logs_provider_id', 'wt_comm_logs_channel_direction']) {
      await queryInterface.removeIndex('wt_comm_logs', name).catch(() => {});
    }
    for (const col of ['read_by_party_at', 'read_by_staff_at', 'author', 'body', 'party_type', 'provider_id']) {
      if (t[col]) await queryInterface.removeColumn('wt_comm_logs', col);
    }
  },
};
