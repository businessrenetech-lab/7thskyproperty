'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, ENUM, DECIMAL, DATE, DATEONLY, BOOLEAN } = Sequelize;
    const tables = new Set((await queryInterface.showAllTables()).map((name) => String(name).toLowerCase()));
    const money = (allowNull = false) => ({ type: DECIMAL(15, 2), allowNull, ...(allowNull ? {} : { defaultValue: 0 }) });
    const timestamps = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    const branchFk = { type: INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onDelete: 'RESTRICT' };
    const nullableFk = (table, onDelete = 'SET NULL') => ({ type: INTEGER, allowNull: true, references: { model: table, key: 'id' }, onDelete });
    const requiredFk = (table, onDelete = 'CASCADE') => ({ type: INTEGER, allowNull: false, references: { model: table, key: 'id' }, onDelete });
    const ensureTable = async (name, columns) => {
      if (tables.has(name)) return;
      await queryInterface.createTable(name, columns);
      tables.add(name);
    };
    const ensureIndex = async (table, fields, options) => {
      const indexes = await queryInterface.showIndex(table);
      if (!indexes.some((index) => index.name === options.name)) await queryInterface.addIndex(table, fields, options);
    };
    const ensureColumn = async (table, column, definition) => {
      const description = await queryInterface.describeTable(table);
      if (!description[column]) await queryInterface.addColumn(table, column, definition);
    };

    await ensureTable('accounts', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branchFk,
      code: { type: STRING(40), allowNull: false }, name: { type: STRING, allowNull: false },
      type: { type: ENUM('asset', 'liability', 'equity', 'revenue', 'expense'), allowNull: false },
      sub_type: STRING(60), parent_id: nullableFk('accounts'), is_active: { type: BOOLEAN, allowNull: false, defaultValue: true }, ...timestamps,
    });
    await ensureIndex('accounts', ['branch_id', 'code'], { name: 'uq_accounts_branch_code', unique: true });
    await ensureIndex('accounts', ['branch_id', 'type', 'is_active'], { name: 'idx_accounts_branch_type' });

    await ensureTable('journal_entries', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branchFk,
      ref_no: { type: STRING(80), allowNull: false }, description: TEXT, date: { type: DATEONLY, allowNull: false },
      posted_by: nullableFk('users'), ...timestamps,
    });
    await ensureIndex('journal_entries', ['branch_id', 'ref_no'], { name: 'uq_journal_entries_branch_ref', unique: true });
    await ensureIndex('journal_entries', ['branch_id', 'date'], { name: 'idx_journal_entries_branch_date' });

    await ensureTable('journal_lines', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, journal_entry_id: requiredFk('journal_entries'),
      account_id: requiredFk('accounts', 'RESTRICT'), debit: money(), credit: money(), notes: STRING, ...timestamps,
    });
    await ensureIndex('journal_lines', ['journal_entry_id'], { name: 'idx_journal_lines_entry' });
    await ensureIndex('journal_lines', ['account_id'], { name: 'idx_journal_lines_account' });

    await ensureTable('bank_accounts', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branchFk,
      account_name: { type: STRING, allowNull: false }, account_number: { type: STRING(80), allowNull: false },
      bank_name: { type: STRING, allowNull: false }, routing_number: STRING(40),
      account_type: { type: ENUM('trust', 'operating', 'other'), allowNull: false, defaultValue: 'other' },
      currency: { type: STRING(3), allowNull: false, defaultValue: 'BDT' }, balance: money(),
      is_active: { type: BOOLEAN, allowNull: false, defaultValue: true }, ...timestamps,
    });
    await ensureIndex('bank_accounts', ['branch_id', 'account_number'], { name: 'uq_bank_accounts_branch_number', unique: true });

    await ensureTable('bank_statement_lines', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branchFk,
      bank_account_id: requiredFk('bank_accounts', 'RESTRICT'), date: { type: DATEONLY, allowNull: false },
      description: STRING, reference: STRING(120), amount: { type: DECIMAL(15, 2), allowNull: false },
      status: { type: ENUM('unmatched', 'matched', 'ignored'), allowNull: false, defaultValue: 'unmatched' },
      matched_entity_type: STRING(40), matched_entity_id: INTEGER, matched_by: nullableFk('users'), matched_at: DATE,
      import_key: STRING(120), ...timestamps,
    });
    await ensureIndex('bank_statement_lines', ['branch_id', 'bank_account_id', 'date'], { name: 'idx_bank_lines_account_date' });
    await ensureIndex('bank_statement_lines', ['bank_account_id', 'import_key'], { name: 'uq_bank_lines_import_key', unique: true });

    await ensureTable('bank_account_ledger_maps', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, bank_account_id: requiredFk('bank_accounts'),
      account_id: requiredFk('accounts', 'RESTRICT'), branch_id: branchFk,
      channel: { type: ENUM('cash', 'bank', 'bkash', 'nagad', 'card', 'bank_transfer', 'website'), allowNull: false },
      is_active: { type: BOOLEAN, allowNull: false, defaultValue: true }, ...timestamps,
    });
    await ensureIndex('bank_account_ledger_maps', ['branch_id', 'bank_account_id', 'account_id', 'channel'], { name: 'uq_bank_ledger_map', unique: true });

    await ensureTable('party_bank_accounts', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branchFk,
      contact_id: requiredFk('contacts', 'RESTRICT'), role_type: { type: ENUM('vendor', 'buyer', 'third_party'), allowNull: false },
      bank_name: { type: STRING, allowNull: false }, bank_branch: STRING, account_name: { type: STRING, allowNull: false },
      account_number: { type: STRING(80), allowNull: false }, account_number_hash: { type: STRING(64), allowNull: false },
      routing_number: STRING(40), status: { type: ENUM('pending', 'verified', 'rejected'), allowNull: false, defaultValue: 'pending' },
      is_primary: { type: BOOLEAN, allowNull: false, defaultValue: false }, verification_note: TEXT,
      verified_by: nullableFk('users'), verified_at: DATE, created_by: nullableFk('users'), ...timestamps,
    });
    await ensureIndex('party_bank_accounts', ['branch_id', 'contact_id', 'account_number_hash'], { name: 'uq_party_bank_account', unique: true });
    await ensureIndex('party_bank_accounts', ['branch_id', 'contact_id', 'status'], { name: 'idx_party_bank_status' });

    await ensureTable('sale_trust_accounts', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branchFk,
      settlement_id: requiredFk('sale_settlements'), beneficiary_key: { type: STRING(80), allowNull: false },
      account_type: { type: ENUM('clearing', 'vendor', 'buyer', 'agency', 'third_party'), allowNull: false },
      transaction_party_id: nullableFk('sale_transaction_parties'), contact_id: nullableFk('contacts'),
      status: { type: ENUM('open', 'closed'), allowNull: false, defaultValue: 'open' }, closed_at: DATE, ...timestamps,
    });
    await ensureIndex('sale_trust_accounts', ['settlement_id', 'beneficiary_key'], { name: 'uq_sale_trust_beneficiary', unique: true });
    await ensureIndex('sale_trust_accounts', ['branch_id', 'status'], { name: 'idx_sale_trust_branch_status' });

    await ensureTable('sale_trust_entries', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branchFk,
      settlement_id: requiredFk('sale_settlements'), trust_account_id: requiredFk('sale_trust_accounts'),
      settlement_line_id: nullableFk('sale_settlement_lines'), payment_id: nullableFk('sale_payments'),
      disbursement_id: nullableFk('sale_disbursements'),
      entry_type: { type: ENUM('receipt', 'allocation_in', 'allocation_out', 'payout', 'reversal', 'adjustment'), allowNull: false },
      debit: money(), credit: money(), source_key: { type: STRING(140), allowNull: false }, description: TEXT,
      created_by: nullableFk('users'), ...timestamps,
    });
    await ensureIndex('sale_trust_entries', ['settlement_id', 'source_key'], { name: 'uq_sale_trust_source', unique: true });
    await ensureIndex('sale_trust_entries', ['trust_account_id', 'id'], { name: 'idx_sale_trust_entries_account' });

    await ensureTable('sale_funding_requests', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branchFk,
      settlement_id: requiredFk('sale_settlements'), transaction_party_id: requiredFk('sale_transaction_parties', 'RESTRICT'),
      request_type: { type: ENUM('deposit', 'balance', 'full', 'top_up'), allowNull: false }, amount: money(),
      provider: { type: ENUM('manual_bank', 'sslcommerz'), allowNull: false, defaultValue: 'manual_bank' },
      provider_reference: STRING(120), idempotency_key: { type: STRING(120), allowNull: false },
      status: { type: ENUM('draft', 'pending', 'paid', 'failed', 'cancelled', 'expired'), allowNull: false, defaultValue: 'draft' },
      expires_at: DATE, paid_payment_id: nullableFk('sale_payments'), created_by: nullableFk('users'), ...timestamps,
    });
    await ensureIndex('sale_funding_requests', ['branch_id', 'idempotency_key'], { name: 'uq_sale_funding_idempotency', unique: true });
    await ensureIndex('sale_funding_requests', ['settlement_id', 'status'], { name: 'idx_sale_funding_status' });

    await ensureTable('sale_payout_attempts', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true }, branch_id: branchFk,
      disbursement_id: requiredFk('sale_disbursements'), attempt_no: { type: INTEGER, allowNull: false },
      method: { type: ENUM('manual_bank', 'sslcommerz_refund', 'provider'), allowNull: false },
      provider_reference: STRING(120), idempotency_key: { type: STRING(120), allowNull: false },
      status: { type: ENUM('submitted', 'processing', 'paid', 'failed'), allowNull: false },
      failure_code: STRING(80), failure_reason: TEXT, request_payload: Sequelize.JSON, response_payload: Sequelize.JSON,
      submitted_at: DATE, completed_at: DATE, created_by: nullableFk('users'), ...timestamps,
    });
    await ensureIndex('sale_payout_attempts', ['branch_id', 'idempotency_key'], { name: 'uq_sale_payout_idempotency', unique: true });
    await ensureIndex('sale_payout_attempts', ['disbursement_id', 'attempt_no'], { name: 'uq_sale_payout_attempt_no', unique: true });

    await ensureColumn('sale_settlements', 'allocation_version', { type: INTEGER, allowNull: false, defaultValue: 0 });
    await ensureColumn('sale_payments', 'bank_statement_line_id', nullableFk('bank_statement_lines'));
    await ensureColumn('sale_payments', 'provider', { type: ENUM('manual_bank', 'sslcommerz'), allowNull: true });
    await ensureColumn('sale_payments', 'provider_payment_id', { type: STRING(120), allowNull: true });
    await ensureColumn('sale_payments', 'provider_status', { type: STRING(40), allowNull: true });
    await ensureColumn('sale_payments', 'idempotency_key', { type: STRING(120), allowNull: true });
    await ensureColumn('sale_payments', 'gross_amount', money(true));
    await ensureColumn('sale_payments', 'fee_amount', money());
    await ensureIndex('sale_payments', ['branch_id', 'idempotency_key'], { name: 'uq_sale_payments_idempotency', unique: true });
    await ensureIndex('sale_payments', ['bank_statement_line_id'], { name: 'uq_sale_payment_bank_line', unique: true });

    await ensureColumn('sale_disbursements', 'party_bank_account_id', nullableFk('party_bank_accounts'));
    await ensureColumn('sale_disbursements', 'destination_bank_account_id', nullableFk('bank_accounts'));
    await ensureColumn('sale_disbursements', 'payout_method', { type: ENUM('manual_bank', 'sslcommerz_refund', 'provider'), allowNull: false, defaultValue: 'manual_bank' });
    await ensureColumn('sale_disbursements', 'provider', { type: STRING(40), allowNull: true });
    await ensureColumn('sale_disbursements', 'provider_reference', { type: STRING(120), allowNull: true });
    await ensureColumn('sale_disbursements', 'failure_code', { type: STRING(80), allowNull: true });
    await ensureColumn('sale_disbursements', 'failure_reason', { type: TEXT, allowNull: true });
    await ensureColumn('sale_disbursements', 'attempt_count', { type: INTEGER, allowNull: false, defaultValue: 0 });
    await ensureColumn('sale_disbursements', 'last_attempt_at', { type: DATE, allowNull: true });
    await queryInterface.changeColumn('sale_disbursements', 'status', {
      type: ENUM('pending', 'prepared', 'submitted', 'processing', 'paid', 'failed', 'cancelled'), allowNull: false, defaultValue: 'pending',
    });
    await ensureIndex('sale_disbursements', ['payment_id'], { name: 'uq_sale_disbursements_payment', unique: true });

    await ensureColumn('sale_profiles', 'trust_bank_account_id', nullableFk('bank_accounts'));
    await ensureColumn('sale_profiles', 'agency_bank_account_id', nullableFk('bank_accounts'));
    await ensureColumn('sale_profiles', 'agency_operating_account_id', nullableFk('accounts'));
    await ensureColumn('sale_profiles', 'commission_revenue_account_id', nullableFk('accounts'));
    await ensureColumn('sale_profiles', 'marketing_revenue_account_id', nullableFk('accounts'));
  },

  async down(queryInterface) {
    const existing = () => queryInterface.showAllTables().then((rows) => rows.map((name) => String(name).toLowerCase()));
    for (const table of ['sale_payout_attempts', 'sale_funding_requests', 'sale_trust_entries', 'sale_trust_accounts', 'party_bank_accounts']) {
      if ((await existing()).includes(table)) await queryInterface.dropTable(table);
    }
  },
};
