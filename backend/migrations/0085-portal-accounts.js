'use strict';

/**
 * Migration 0085: real portal accounts for providers and clients.
 *
 * Phase 6 gave external parties a magic link. A link is right for one-off
 * access, but it is the wrong shape for a relationship that lasts: it expires,
 * it cannot be remembered, forwarding it hands over full access, and there is no
 * way for the holder to change anything about their own access.
 *
 * So a provider or client now gets a real account — their own email and
 * password, created automatically when their agreement is signed. The magic link
 * stays for the cases it suits (a one-off quotation decision, someone who never
 * signs in), and the two coexist: the portal accepts either.
 *
 * Everything here hangs off the EXISTING users table rather than a parallel
 * identity system. One login, one session, one password policy — a second user
 * table is how a system ends up with two ways to authenticate and only one of
 * them patched.
 *
 * Password reset did not exist anywhere in this codebase before now, for any
 * role. Staff had to have a password set for them by an administrator. Adding it
 * here means external parties can recover their own access without a phone call,
 * and staff get the same thing for free.
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

    await add('users', {
      /*
       * A password an administrator generated is a password the account holder
       * has never chosen. This forces a change on first sign-in, so the
       * temporary one that travelled through an email stops working the moment
       * it has been used once.
       */
      must_change_password: { type: D.BOOLEAN, defaultValue: false },
      password_changed_at: { type: D.DATE },
      last_login_at: { type: D.DATE },
      // Only the HASH of a reset token is stored, for the same reason the portal
      // token is hashed: a leaked backup must not yield working reset links.
      reset_token_hash: { type: D.STRING(128) },
      reset_token_expires_at: { type: D.DATE },
    });

    await queryInterface.addIndex('users', ['reset_token_hash'], { name: 'users_reset_token' }).catch(() => {});

    // Which party this login speaks for. Nullable: staff accounts have neither.
    await add('wt_providers', { portal_user_id: { type: D.INTEGER } });
    await add('wt_clients', { portal_user_id: { type: D.INTEGER } });
    await queryInterface.addIndex('wt_providers', ['portal_user_id'], { name: 'wt_providers_portal_user' }).catch(() => {});
    await queryInterface.addIndex('wt_clients', ['portal_user_id'], { name: 'wt_clients_portal_user' }).catch(() => {});
  },

  async down(queryInterface) {
    for (const c of ['must_change_password', 'password_changed_at', 'last_login_at', 'reset_token_hash', 'reset_token_expires_at']) {
      await queryInterface.removeColumn('users', c).catch(() => {});
    }
    await queryInterface.removeColumn('wt_providers', 'portal_user_id').catch(() => {});
    await queryInterface.removeColumn('wt_clients', 'portal_user_id').catch(() => {});
  },
};
