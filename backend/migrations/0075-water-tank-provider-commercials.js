'use strict';

/**
 * Versioned Water Tank provider agreements and effective-dated rate cards.
 * Signing envelopes remain the legal record; these tables are the operational
 * projection used for assignment, fee calculation and payout auditing.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const describe = async (table) => { try { return await queryInterface.describeTable(table); } catch { return null; } };
    const add = async (table, column, spec) => {
      const columns = await describe(table);
      if (columns && !columns[column]) await queryInterface.addColumn(table, column, spec);
    };

    if (!(await describe('wt_provider_agreements'))) {
      await queryInterface.createTable('wt_provider_agreements', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        code: { type: S.STRING(40), allowNull: false, unique: true },
        provider_id: { type: S.INTEGER, allowNull: false },
        envelope_id: S.INTEGER,
        version_no: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        supersedes_id: S.INTEGER,
        status: { type: S.STRING(30), allowNull: false, defaultValue: 'Draft' },
        effective_date: S.DATEONLY,
        expiry_date: S.DATEONLY,
        term_months: { type: S.INTEGER, allowNull: false, defaultValue: 12 },
        notice_days: { type: S.INTEGER, allowNull: false, defaultValue: 30 },
        commission_pct: { type: S.DECIMAL(7, 3), allowNull: false, defaultValue: 0 },
        payment_model: { type: S.STRING(40), allowNull: false, defaultValue: 'Project Based' },
        payout_trigger: { type: S.STRING(50), allowNull: false, defaultValue: 'Completion Verified' },
        payment_due_days: { type: S.INTEGER, allowNull: false, defaultValue: 7 },
        payment_terms: S.TEXT,
        fee_notes: S.TEXT,
        bank_details: S.JSON,
        authorised_services: S.JSON,
        compliance_checklist: S.JSON,
        territory_terms: S.JSON,
        terms_snapshot: S.JSON,
        drafted_by: S.INTEGER,
        sent_at: S.DATE,
        completed_at: S.DATE,
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
      });
      await queryInterface.addIndex('wt_provider_agreements', ['branch_id', 'provider_id'], { name: 'wt_provider_agreements_provider' });
      await queryInterface.addIndex('wt_provider_agreements', ['envelope_id'], { name: 'wt_provider_agreements_envelope' });
    }

    if (!(await describe('wt_provider_agreement_rates'))) {
      await queryInterface.createTable('wt_provider_agreement_rates', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        agreement_id: { type: S.INTEGER, allowNull: false },
        provider_id: { type: S.INTEGER, allowNull: false },
        service_item_id: S.INTEGER,
        service_code: { type: S.STRING(40), allowNull: false },
        service_name: { type: S.STRING(220), allowNull: false },
        rate_group: { type: S.STRING(30), allowNull: false, defaultValue: 'service' },
        unit: S.STRING(60),
        standard_rate: { type: S.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        proposed_rate: { type: S.DECIMAL(15, 2), allowNull: true },
        agreed_rate: { type: S.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        rate_status: { type: S.STRING(30), allowNull: false, defaultValue: 'Approved' },
        effective_from: S.DATEONLY,
        effective_to: S.DATEONLY,
        approved_by: S.INTEGER,
        approved_at: S.DATE,
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
      });
      await queryInterface.addIndex('wt_provider_agreement_rates', ['agreement_id', 'service_code'], { name: 'wt_provider_rates_agreement_code', unique: true });
      await queryInterface.addIndex('wt_provider_agreement_rates', ['branch_id', 'provider_id', 'effective_from'], { name: 'wt_provider_rates_active' });
    }

    await add('wt_providers', 'active_agreement_id', S.INTEGER);
    await add('wt_providers', 'onboarding_token_hash', S.STRING(128));
    await add('wt_providers', 'onboarding_token_expires_at', S.DATE);
    await add('wt_providers', 'onboarding_submission_status', { type: S.STRING(30), defaultValue: 'Staff Draft' });
    await add('wt_providers', 'onboarding_last_step', { type: S.INTEGER, defaultValue: 0 });
    await add('wt_providers', 'bank_details', S.JSON);
    await add('wt_providers', 'proposed_rates', S.JSON);
    await add('wt_providers', 'payment_verified', { type: S.BOOLEAN, defaultValue: false });
    await add('wt_providers', 'availability_notes', S.TEXT);

    await add('wt_work_orders', 'provider_agreement_id', S.INTEGER);
    await add('wt_work_orders', 'provider_rate_snapshot', S.JSON);
    await add('wt_work_orders', 'provider_gross_charge', { type: S.DECIMAL(15, 2), defaultValue: 0 });
    await add('wt_work_orders', 'provider_commission_pct', { type: S.DECIMAL(7, 3), defaultValue: 0 });
    await add('wt_work_orders', 'provider_commission_amount', { type: S.DECIMAL(15, 2), defaultValue: 0 });
    await add('wt_work_orders', 'provider_net_payable', { type: S.DECIMAL(15, 2), defaultValue: 0 });
    await add('wt_work_orders', 'fee_override_reason', S.TEXT);
    await add('wt_work_orders', 'fee_override_by', S.STRING(120));
  },

  down: async (queryInterface) => {
    for (const column of ['provider_agreement_id', 'provider_rate_snapshot', 'provider_gross_charge', 'provider_commission_pct', 'provider_commission_amount', 'provider_net_payable', 'fee_override_reason', 'fee_override_by']) {
      try { await queryInterface.removeColumn('wt_work_orders', column); } catch { /* absent */ }
    }
    for (const column of ['active_agreement_id', 'onboarding_token_hash', 'onboarding_token_expires_at', 'onboarding_submission_status', 'onboarding_last_step', 'bank_details', 'proposed_rates', 'payment_verified', 'availability_notes']) {
      try { await queryInterface.removeColumn('wt_providers', column); } catch { /* absent */ }
    }
    try { await queryInterface.dropTable('wt_provider_agreement_rates'); } catch { /* absent */ }
    try { await queryInterface.dropTable('wt_provider_agreements'); } catch { /* absent */ }
  },
};
