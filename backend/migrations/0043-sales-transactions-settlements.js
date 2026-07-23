'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, ENUM, DECIMAL, DATE, DATEONLY, BOOLEAN, JSON } = Sequelize;
    const existing = new Set((await queryInterface.showAllTables()).map((name) => String(name).toLowerCase()));
    const money = () => ({ type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 });
    const timestamps = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    const branch = { type: INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onDelete: 'RESTRICT' };
    const nullableFk = (table) => ({ type: INTEGER, allowNull: true, references: { model: table, key: 'id' }, onDelete: 'SET NULL' });
    const optionalLegacyFk = (table) => existing.has(table) ? nullableFk(table) : { type: INTEGER, allowNull: true };
    const requiredFk = (table) => ({ type: INTEGER, allowNull: false, references: { model: table, key: 'id' }, onDelete: 'CASCADE' });
    const create = async (name, columns, indexes = []) => {
      if (!existing.has(name)) {
        await queryInterface.createTable(name, columns);
        existing.add(name);
      }
      for (const index of indexes) await queryInterface.addIndex(name, index.fields, { name: index.name, unique: !!index.unique }).catch(() => {});
    };

    await create('sale_profiles', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branch,
      property_id: { ...requiredFk('properties'), unique: true }, asking_price: money(), reserve_price: money(),
      agency_type: { type: ENUM('exclusive', 'open', 'sole', 'joint'), allowNull: true },
      commission_percent: { type: DECIMAL(6, 2), allowNull: true }, commission_fixed: money(), marketing_budget: money(),
      agreement_start_date: DATEONLY, agreement_end_date: DATEONLY,
      agreement_status: { type: ENUM('not_started', 'draft', 'sent', 'signed', 'expired', 'terminated'), allowNull: false, defaultValue: 'not_started' },
      target_settlement_date: DATEONLY, notes: TEXT,
      compliance_status: { type: ENUM('pending', 'clear', 'blocked'), allowNull: false, defaultValue: 'pending' },
      assessment_status: { type: ENUM('pending', 'complete', 'waived', 'blocked'), allowNull: false, defaultValue: 'pending' },
      client_money_bank_account_id: optionalLegacyFk('accounts'), client_funds_liability_account_id: optionalLegacyFk('accounts'),
      created_by: nullableFk('users'), updated_by: nullableFk('users'), ...timestamps,
    }, [{ fields: ['branch_id', 'property_id'], name: 'idx_sale_profiles_branch_property', unique: true }]);

    await create('sale_parties', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branch, property_id: requiredFk('properties'),
      contact_id: nullableFk('contacts'), role: { type: ENUM('vendor', 'solicitor', 'representative'), allowNull: false },
      ownership_percent: { type: DECIMAL(6, 2), allowNull: true }, is_primary: { type: BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: ENUM('active', 'withdrawn', 'replaced'), allowNull: false, defaultValue: 'active' },
      start_date: DATEONLY, end_date: DATEONLY, notes: TEXT, replaced_by_party_id: nullableFk('sale_parties'), replacement_reason: TEXT,
      created_by: nullableFk('users'), updated_by: nullableFk('users'), ...timestamps,
    }, [{ fields: ['branch_id', 'property_id', 'role'], name: 'idx_sale_parties_property_role' }]);

    await create('sale_offers', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branch, property_id: requiredFk('properties'),
      offer_code: { type: STRING(40), allowNull: false, unique: true }, offer_type: { type: STRING(40), allowNull: false, defaultValue: 'standard' },
      amount: money(), deposit_amount: money(), finance_status: STRING(40), source: { type: STRING(20), allowNull: false, defaultValue: 'staff' },
      proof_url: STRING, conditions: JSON, expiry_date: DATEONLY, proposed_completion_date: DATEONLY,
      solicitor_name: STRING, solicitor_phone: STRING, solicitor_email: STRING, notes: TEXT,
      status: { type: ENUM('draft', 'submitted', 'countered', 'accepted', 'rejected', 'withdrawn', 'expired'), allowNull: false, defaultValue: 'draft' },
      status_reason: TEXT, submitted_at: DATE, accepted_at: DATE, created_by: nullableFk('users'), updated_by: nullableFk('users'), ...timestamps,
    }, [{ fields: ['branch_id', 'property_id', 'status'], name: 'idx_sale_offers_property_status' }]);

    await create('sale_offer_parties', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branch, offer_id: requiredFk('sale_offers'),
      contact_id: nullableFk('contacts'), client_id: nullableFk('clients'), ownership_percent: { type: DECIMAL(6, 2), allowNull: true },
      is_primary: { type: BOOLEAN, allowNull: false, defaultValue: false }, ...timestamps,
    }, [{ fields: ['offer_id'], name: 'idx_sale_offer_parties_offer' }]);

    await create('sale_transactions', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branch, property_id: requiredFk('properties'),
      property_deal_id: { ...requiredFk('property_deals'), unique: true }, accepted_offer_id: { ...requiredFk('sale_offers'), unique: true },
      status: { type: ENUM('active', 'settlement', 'completed', 'cancelled'), allowNull: false, defaultValue: 'active' },
      created_by: nullableFk('users'), ...timestamps,
    }, [{ fields: ['branch_id', 'property_id', 'status'], name: 'idx_sale_transactions_property_status' }]);

    await create('sale_transaction_parties', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branch, transaction_id: requiredFk('sale_transactions'),
      party_type: { type: ENUM('buyer', 'vendor'), allowNull: false }, contact_id: nullableFk('contacts'), client_id: nullableFk('clients'),
      snapshot_name: { type: STRING, allowNull: false }, snapshot_phone: STRING, snapshot_email: STRING,
      ownership_percent: { type: DECIMAL(6, 2), allowNull: true }, is_primary: { type: BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: ENUM('active', 'withdrawn', 'replaced'), allowNull: false, defaultValue: 'active' },
      replaced_party_id: nullableFk('sale_transaction_parties'), replacement_reason: TEXT, withdrawn_at: DATE, created_by: nullableFk('users'), ...timestamps,
    }, [{ fields: ['transaction_id', 'party_type', 'status'], name: 'idx_sale_transaction_parties_type' }]);

    await create('sale_settlements', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branch,
      transaction_id: { ...requiredFk('sale_transactions'), unique: true }, settlement_code: { type: STRING(40), allowNull: false, unique: true },
      status: { type: ENUM('draft', 'submitted', 'reviewed', 'returned', 'approved', 'locked'), allowNull: false, defaultValue: 'draft' },
      prepared_by: nullableFk('users'), submitted_by: nullableFk('users'), submitted_at: DATE, reviewed_by: nullableFk('users'), reviewed_at: DATE,
      approved_by: nullableFk('users'), approved_at: DATE, returned_by: nullableFk('users'), returned_at: DATE, return_reason: TEXT,
      locked_by: nullableFk('users'), locked_at: DATE, ...timestamps,
    }, [{ fields: ['branch_id', 'status'], name: 'idx_sale_settlements_branch_status' }]);

    await create('sale_settlement_lines', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branch, settlement_id: requiredFk('sale_settlements'),
      line_type: { type: ENUM('purchase_price', 'deposit', 'buyer_receipt', 'buyer_refund', 'commission', 'agency_fee', 'advertising', 'admin_fee', 'vat_tax', 'legal_fee', 'registration_fee', 'lender_payoff', 'rates_adjustment', 'utility_adjustment', 'third_party', 'vendor_proceeds', 'rounding'), allowNull: false },
      direction: { type: ENUM('debit', 'credit'), allowNull: false }, amount: money(),
      payee_transaction_party_id: nullableFk('sale_transaction_parties'), payee_contact_id: nullableFk('contacts'), description: TEXT, due_date: DATEONLY,
      created_by: nullableFk('users'), ...timestamps,
    }, [{ fields: ['settlement_id', 'line_type'], name: 'idx_sale_settlement_lines_type' }]);

    await create('sale_payments', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branch, settlement_id: requiredFk('sale_settlements'),
      direction: { type: ENUM('incoming', 'outgoing'), allowNull: false }, reference: { type: STRING(80), allowNull: false },
      payment_at: { type: DATE, allowNull: false }, value_date: DATEONLY, amount: money(), method: STRING(40),
      from_account_name: STRING, from_account_number: STRING, to_account_name: STRING, to_account_number: STRING,
      proof_url: STRING, status: { type: ENUM('pending', 'cleared', 'rejected', 'reversed'), allowNull: false, defaultValue: 'pending' },
      reconciliation_status: { type: ENUM('unreconciled', 'matched', 'reconciled'), allowNull: false, defaultValue: 'unreconciled' },
      bank_account_id: optionalLegacyFk('accounts'), liability_account_id: optionalLegacyFk('accounts'), journal_entry_id: optionalLegacyFk('journal_entries'),
      reversal_of_payment_id: nullableFk('sale_payments'), reversal_reason: TEXT, created_by: nullableFk('users'), ...timestamps,
    }, [
      { fields: ['branch_id', 'reference', 'direction'], name: 'uq_sale_payments_branch_ref_direction', unique: true },
      { fields: ['reversal_of_payment_id'], name: 'uq_sale_payments_one_reversal', unique: true },
      { fields: ['settlement_id', 'status'], name: 'idx_sale_payments_settlement_status' },
    ]);

    await create('sale_disbursements', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branch, settlement_id: requiredFk('sale_settlements'),
      settlement_line_id: nullableFk('sale_settlement_lines'), payee_type: { type: ENUM('vendor', 'third_party'), allowNull: false },
      transaction_party_id: nullableFk('sale_transaction_parties'), contact_id: nullableFk('contacts'), amount: money(),
      bank_name: STRING, bank_account_name: STRING, bank_account_number: STRING, routing_number: STRING, reference: STRING(80), proof_url: STRING,
      status: { type: ENUM('pending', 'paid', 'cancelled'), allowNull: false, defaultValue: 'pending' }, payment_id: nullableFk('sale_payments'),
      paid_at: DATE, created_by: nullableFk('users'), ...timestamps,
    }, [{ fields: ['settlement_id', 'status'], name: 'idx_sale_disbursements_settlement_status' }]);

    await create('sale_settlement_approvals', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branch, settlement_id: requiredFk('sale_settlements'),
      action: { type: ENUM('submit', 'review', 'approve', 'return', 'lock'), allowNull: false }, actor_id: nullableFk('users'), reason: TEXT,
      from_status: STRING(20), to_status: STRING(20), ip_address: STRING(64), created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    }, [{ fields: ['settlement_id', 'created_at'], name: 'idx_sale_settlement_approvals' }]);

    await create('sale_events', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branch, property_id: nullableFk('properties'),
      entity_type: { type: STRING(40), allowNull: false }, entity_id: { type: INTEGER, allowNull: false }, event_type: { type: STRING(60), allowNull: false },
      actor_id: nullableFk('users'), old_value: JSON, new_value: JSON, reason: TEXT, ip_address: STRING(64),
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    }, [{ fields: ['branch_id', 'property_id', 'created_at'], name: 'idx_sale_events_property' }, { fields: ['entity_type', 'entity_id'], name: 'idx_sale_events_entity' }]);
  },

  async down(queryInterface) {
    for (const table of ['sale_events', 'sale_settlement_approvals', 'sale_disbursements', 'sale_payments', 'sale_settlement_lines', 'sale_settlements', 'sale_transaction_parties', 'sale_transactions', 'sale_offer_parties', 'sale_offers', 'sale_parties', 'sale_profiles']) {
      await queryInterface.dropTable(table).catch(() => {});
    }
  },
};
