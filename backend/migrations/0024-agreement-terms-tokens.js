'use strict';

/**
 * 0024 — Agreement terms + public tokens.
 *
 * 1. signing_envelopes.terms      — structured agreement terms (rent, deposit,
 *    service charge %, commission, bank details…). On envelope completion the
 *    activation hook syncs these into the operational records so nothing is
 *    typed twice.
 * 2. signing_envelopes.cc_emails  — CC recipients (e.g. owner CC on tenancy
 *    agreements), notified on send + completion.
 * 3. party_role_profiles.registration_token — public self-registration link
 *    for vendor/buyer/supplier/landlord KYC + document upload.
 * 4. tenant_applications.owner_approval_token — public owner approval link.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { STRING, DATE, JSON: JSONT } = Sequelize;
    const qi = queryInterface;
    const addCol = async (table, col, spec) => {
      const desc = await qi.describeTable(table).catch(() => ({}));
      if (!desc[col]) await qi.addColumn(table, col, spec);
    };

    await addCol('signing_envelopes', 'terms', { type: JSONT, defaultValue: null });
    await addCol('signing_envelopes', 'cc_emails', { type: JSONT, defaultValue: [] });

    await addCol('party_role_profiles', 'registration_token', { type: STRING(120), unique: true });
    await addCol('party_role_profiles', 'registration_expires_at', { type: DATE });
    await addCol('party_role_profiles', 'registration_submitted_at', { type: DATE });

    await addCol('tenant_applications', 'owner_approval_token', { type: STRING(120), unique: true });
    await addCol('tenant_applications', 'owner_approval_expires_at', { type: DATE });
    await addCol('tenant_applications', 'owner_approval_sent_at', { type: DATE });
    await addCol('tenant_applications', 'owner_decided_at', { type: DATE });
    await addCol('tenant_applications', 'owner_decision_note', { type: Sequelize.TEXT });
  },

  async down(queryInterface) {
    const qi = queryInterface;
    for (const c of ['terms', 'cc_emails']) await qi.removeColumn('signing_envelopes', c).catch(() => {});
    for (const c of ['registration_token', 'registration_expires_at', 'registration_submitted_at']) await qi.removeColumn('party_role_profiles', c).catch(() => {});
    for (const c of ['owner_approval_token', 'owner_approval_expires_at', 'owner_approval_sent_at', 'owner_decided_at', 'owner_decision_note']) await qi.removeColumn('tenant_applications', c).catch(() => {});
  },
};
