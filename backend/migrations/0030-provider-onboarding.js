'use strict';

/**
 * 0030 — Service Provider onboarding & verification (Property Care Services).
 * Extends service_providers into a full provider profile (KYC, licensing, payment,
 * territory, verification flags, own folio, self-registration token) and adds a
 * capability matrix linking a provider to the catalog categories they can deliver.
 * Reuses provider_compliance for compliance + insurance docs (adds doc_category).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, DATE, DATEONLY, BOOLEAN, JSON: JSONT, ENUM } = Sequelize;
    const qi = queryInterface;
    const addCol = async (t, c, spec) => { const d = await qi.describeTable(t).catch(() => ({})); if (!d[c]) await qi.addColumn(t, c, spec); };
    const has = async (t) => { try { await qi.describeTable(t); return true; } catch { return false; } };
    const stamps = {
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    };

    // ── Provider profile fields ──
    await addCol('service_providers', 'provider_type', { type: ENUM('third_party', 'internal'), defaultValue: 'third_party' });
    await addCol('service_providers', 'vertical', { type: STRING(60) });        // e.g. water_tank (or null = all)
    await addCol('service_providers', 'trade_licence_no', { type: STRING });
    await addCol('service_providers', 'company_reg_no', { type: STRING });
    await addCol('service_providers', 'tin', { type: STRING });
    await addCol('service_providers', 'bin', { type: STRING });
    await addCol('service_providers', 'account_manager_id', { type: INTEGER });
    await addCol('service_providers', 'onboarding_stage', { type: ENUM('applied', 'kyc_submitted', 'verifying', 'agreement_pending', 'active', 'suspended', 'terminated'), defaultValue: 'applied' });
    // verification aspects
    await addCol('service_providers', 'kyc_verified', { type: BOOLEAN, defaultValue: false });
    await addCol('service_providers', 'compliance_verified', { type: BOOLEAN, defaultValue: false });
    await addCol('service_providers', 'insurance_verified', { type: BOOLEAN, defaultValue: false });
    await addCol('service_providers', 'capability_verified', { type: BOOLEAN, defaultValue: false });
    await addCol('service_providers', 'payment_verified', { type: BOOLEAN, defaultValue: false });
    await addCol('service_providers', 'agreement_status', { type: ENUM('none', 'sent', 'signed'), defaultValue: 'none' });
    await addCol('service_providers', 'verified_at', { type: DATE });
    // territory (Cumilla exclusivity + coverage)
    await addCol('service_providers', 'districts', { type: JSONT, defaultValue: null });
    await addCol('service_providers', 'cities', { type: JSONT, defaultValue: null });
    await addCol('service_providers', 'cumilla_restricted', { type: BOOLEAN, defaultValue: false });
    await addCol('service_providers', 'exclusive_territory', { type: BOOLEAN, defaultValue: false });
    // payment / folio
    await addCol('service_providers', 'preferred_payment', { type: STRING(40) });
    await addCol('service_providers', 'folio_id', { type: INTEGER });
    // self-registration
    await addCol('service_providers', 'registration_token', { type: STRING(80) });
    await addCol('service_providers', 'registration_expires_at', { type: DATE });
    await addCol('service_providers', 'registration_submitted_at', { type: DATE });

    // ── provider_compliance: distinguish compliance vs insurance vs kyc ──
    await addCol('provider_compliance', 'doc_category', { type: ENUM('kyc', 'compliance', 'insurance', 'certification', 'other'), defaultValue: 'compliance' });
    await addCol('provider_compliance', 'verified', { type: BOOLEAN, defaultValue: false });

    // ── Capability matrix: provider → catalog category (+ optional service) ──
    if (!(await has('provider_capabilities'))) {
      await qi.createTable('provider_capabilities', {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true },
        provider_id: { type: INTEGER, allowNull: false },
        category_id: { type: INTEGER },   // care_service_categories
        service_id: { type: INTEGER },    // care_services (optional, finer grain)
        is_capable: { type: BOOLEAN, defaultValue: true },
        notes: { type: STRING },
        ...stamps,
      });
      await qi.addIndex('provider_capabilities', ['provider_id'], { name: 'idx_prov_cap_provider' });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('provider_capabilities').catch(() => {});
    // additive columns left in place
  },
};
