'use strict';

/**
 * Migration 0084: Water Tank — provider and customer portal access.
 *
 * External parties currently do none of their own steps. A provider accepts a
 * job by telephoning the office, who click Accept on their behalf; a client asks
 * for a copy of their invoice and someone emails a PDF. Every one of those is a
 * staff member impersonating someone else, which is slow and — for anything that
 * is meant to be the other party's decision — not really their decision at all.
 *
 * The token pattern is the one already proven by provider onboarding
 * (`onboarding_token_hash`): a long random token is handed out ONCE, and only its
 * SHA-256 lives in the database. A leaked backup therefore yields no working
 * links, and the column can be compared but never reversed.
 *
 * These are SEPARATE columns from the onboarding token on purpose. Onboarding is
 * a one-time application that expires when it completes; portal access is
 * ongoing and outlives it. Sharing one column would mean finishing onboarding
 * either kills portal access or silently extends an application link forever.
 *
 * `portal_last_seen_at` is not analytics — it answers "did they actually get the
 * link?" before someone chases a provider who never received it.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const D = Sequelize;

    const add = async (table, columns) => {
      const described = await queryInterface.describeTable(table).catch(() => null);
      if (!described) return;
      for (const [name, spec] of Object.entries(columns)) {
        if (described[name]) continue;
        await queryInterface.addColumn(table, name, spec);
      }
    };

    await add('wt_providers', {
      portal_token_hash: { type: D.STRING(128) },
      portal_token_expires_at: { type: D.DATE },
      portal_last_seen_at: { type: D.DATE },
      portal_revoked_at: { type: D.DATE },
    });

    await add('wt_clients', {
      portal_token_hash: { type: D.STRING(128) },
      portal_token_expires_at: { type: D.DATE },
      portal_last_seen_at: { type: D.DATE },
      portal_revoked_at: { type: D.DATE },
    });

    /*
     * Lookup is by hash on every single portal request, so it needs an index.
     * Not unique: two rows could in principle hold a NULL hash, and MySQL treats
     * multiple NULLs as distinct under a unique index anyway — but relying on
     * that is a subtlety nobody should have to remember.
     */
    await queryInterface.addIndex('wt_providers', ['portal_token_hash'], { name: 'wt_providers_portal_token' }).catch(() => {});
    await queryInterface.addIndex('wt_clients', ['portal_token_hash'], { name: 'wt_clients_portal_token' }).catch(() => {});

    /*
     * Every portal action is recorded. An external party changing the state of a
     * work order is exactly the kind of event that gets disputed later — "we
     * never accepted that job" — so who did what, from which address, is kept
     * independently of the record they touched.
     */
    const existing = await queryInterface.describeTable('wt_portal_events').catch(() => null);
    if (!existing) {
      await queryInterface.createTable('wt_portal_events', {
        id: { type: D.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: D.INTEGER, allowNull: false, defaultValue: 1 },
        party_type: { type: D.STRING(20), allowNull: false },   // provider | client
        party_id: { type: D.INTEGER, allowNull: false },
        party_code: { type: D.STRING(30) },
        action: { type: D.STRING(60), allowNull: false },
        subject_type: { type: D.STRING(30) },
        subject_code: { type: D.STRING(30) },
        detail: { type: D.TEXT },
        ip: { type: D.STRING(60) },
        user_agent: { type: D.STRING(255) },
        created_at: { type: D.DATE, allowNull: false, defaultValue: D.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('wt_portal_events', ['branch_id', 'party_type', 'party_id'], { name: 'wt_portal_events_party' });
      await queryInterface.addIndex('wt_portal_events', ['created_at'], { name: 'wt_portal_events_when' });
    }
  },

  async down(queryInterface) {
    for (const t of ['wt_providers', 'wt_clients']) {
      for (const c of ['portal_token_hash', 'portal_token_expires_at', 'portal_last_seen_at', 'portal_revoked_at']) {
        await queryInterface.removeColumn(t, c).catch(() => {});
      }
    }
    await queryInterface.dropTable('wt_portal_events').catch(() => {});
  },
};
