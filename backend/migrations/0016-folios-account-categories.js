'use strict';

/**
 * 0016 — Property management folios + admin-managed account categories.
 * Adds tenant/landlord folios, folio transactions, VAT/provider metadata on
 * property-care invoices, and line-level category/provider attribution.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, BOOLEAN, ENUM, DECIMAL, DATE, DATEONLY } = Sequelize;
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    const fkBranch = { type: INTEGER, allowNull: true, references: { model: 'branches', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' };
    const nf = (table) => ({ type: INTEGER, allowNull: true, references: { model: table, key: 'id' }, onDelete: 'SET NULL' });
    const money = (def = 0) => ({ type: DECIMAL(15, 2), defaultValue: def });

    await queryInterface.createTable('account_categories', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: fkBranch,
      name: { type: STRING, allowNull: false },
      code: { type: STRING(40) },
      type: { type: ENUM('income', 'expense', 'asset', 'liability', 'equity'), defaultValue: 'income' },
      applies_to: { type: ENUM('tenant', 'landlord', 'provider', 'both'), defaultValue: 'both' },
      default_tax_rate: { type: DECIMAL(6, 2), defaultValue: 0 },
      is_billable_to_tenant: { type: BOOLEAN, defaultValue: false },
      is_deductible_from_landlord: { type: BOOLEAN, defaultValue: false },
      is_active: { type: BOOLEAN, defaultValue: true },
      created_by: nf('users'),
      ...ts,
    });

    await queryInterface.createTable('folios', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      folio_code: { type: STRING(40), unique: true },
      folio_type: { type: ENUM('tenant', 'landlord'), allowNull: false },
      folio_scope: { type: ENUM('tenancy', 'landlord', 'landlord_property'), allowNull: false },
      tenancy_id: nf('tenancies'),
      property_id: nf('properties'),
      contact_id: nf('contacts'),
      owner_contact_id: nf('contacts'),
      tenant_contact_id: nf('contacts'),
      status: { type: ENUM('active', 'closed', 'suspended'), defaultValue: 'active' },
      opening_balance: money(0),
      current_balance: money(0),
      rent_balance: money(0),
      service_charge_balance: money(0),
      utility_balance: money(0),
      deposit_held: money(0),
      deposit_available: money(0),
      deposit_deductions: money(0),
      ...ts,
    });

    await queryInterface.createTable('folio_transactions', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      folio_id: { type: INTEGER, allowNull: false, references: { model: 'folios', key: 'id' }, onDelete: 'CASCADE' },
      transaction_type: { type: ENUM('charge', 'payment', 'credit', 'adjustment', 'invoice', 'supplier_bill', 'owner_payout'), allowNull: false },
      bucket: { type: ENUM('rent', 'service_charge', 'utility', 'maintenance', 'deposit', 'deposit_deduction', 'landlord_fee', 'supplier_bill', 'owner_payout', 'adjustment'), defaultValue: 'adjustment' },
      account_category_id: nf('account_categories'),
      invoice_id: nf('invoices'),
      payment_id: nf('payments'),
      provider_id: nf('service_providers'),
      property_id: nf('properties'),
      tenancy_id: nf('tenancies'),
      description: { type: STRING },
      debit: money(0),
      credit: money(0),
      balance_after: money(0),
      transaction_date: { type: DATEONLY },
      created_by: nf('users'),
      ...ts,
    });

    await queryInterface.addColumn('invoices', 'folio_id', nf('folios'));
    await queryInterface.addColumn('invoices', 'account_category_id', nf('account_categories'));
    await queryInterface.addColumn('invoices', 'billed_to_type', { type: ENUM('tenant', 'landlord', 'client', 'provider'), allowNull: true });
    await queryInterface.addColumn('invoices', 'service_for', { type: ENUM('tenant', 'landlord', 'property', 'tenancy'), allowNull: true });
    await queryInterface.addColumn('invoices', 'service_period_start', { type: DATEONLY });
    await queryInterface.addColumn('invoices', 'service_period_end', { type: DATEONLY });
    await queryInterface.addColumn('invoices', 'tax_enabled', { type: BOOLEAN, defaultValue: false });
    await queryInterface.addColumn('invoices', 'tax_included', { type: BOOLEAN, defaultValue: false });
    await queryInterface.addColumn('invoices', 'tax_rate', { type: DECIMAL(6, 2), defaultValue: 0 });
    await queryInterface.addColumn('invoices', 'tax_amount', money(0));

    await queryInterface.addColumn('invoice_items', 'account_category_id', nf('account_categories'));
    await queryInterface.addColumn('invoice_items', 'provider_id', nf('service_providers'));
    await queryInterface.addColumn('invoice_items', 'property_id', nf('properties'));
    await queryInterface.addColumn('invoice_items', 'tenancy_id', nf('tenancies'));
    await queryInterface.addColumn('invoice_items', 'tax_enabled', { type: BOOLEAN, defaultValue: false });
    await queryInterface.addColumn('invoice_items', 'tax_included', { type: BOOLEAN, defaultValue: false });
    await queryInterface.addColumn('invoice_items', 'tax_rate', { type: DECIMAL(6, 2), defaultValue: 0 });
    await queryInterface.addColumn('invoice_items', 'tax_amount', money(0));
    await queryInterface.addColumn('invoice_items', 'billable_to_tenant', { type: BOOLEAN, defaultValue: false });
    await queryInterface.addColumn('invoice_items', 'deductible_from_landlord', { type: BOOLEAN, defaultValue: false });

    await queryInterface.addIndex('account_categories', ['branch_id', 'is_active']);
    await queryInterface.addIndex('folios', ['branch_id', 'folio_type', 'status']);
    await queryInterface.addIndex('folios', ['tenancy_id']);
    await queryInterface.addIndex('folios', ['property_id', 'contact_id']);
    await queryInterface.addIndex('folio_transactions', ['folio_id', 'transaction_date']);
    await queryInterface.addIndex('folio_transactions', ['invoice_id']);

    await queryInterface.bulkInsert('account_categories', [
      { name: 'Rent', code: 'RENT', type: 'income', applies_to: 'tenant', is_billable_to_tenant: true, created_at: new Date(), updated_at: new Date() },
      { name: 'Service Charge', code: 'SERVICE', type: 'income', applies_to: 'tenant', is_billable_to_tenant: true, created_at: new Date(), updated_at: new Date() },
      { name: 'Maintenance', code: 'MAINT', type: 'expense', applies_to: 'both', is_billable_to_tenant: true, is_deductible_from_landlord: true, created_at: new Date(), updated_at: new Date() },
      { name: 'Electrical', code: 'ELEC', type: 'expense', applies_to: 'both', is_billable_to_tenant: true, is_deductible_from_landlord: true, created_at: new Date(), updated_at: new Date() },
      { name: 'Water Usage', code: 'WATER', type: 'income', applies_to: 'tenant', is_billable_to_tenant: true, created_at: new Date(), updated_at: new Date() },
      { name: 'Management Fee', code: 'MGMT-FEE', type: 'income', applies_to: 'landlord', is_deductible_from_landlord: true, created_at: new Date(), updated_at: new Date() },
      { name: 'Security Deposit', code: 'DEPOSIT', type: 'liability', applies_to: 'tenant', created_at: new Date(), updated_at: new Date() },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('invoice_items', 'deductible_from_landlord');
    await queryInterface.removeColumn('invoice_items', 'billable_to_tenant');
    await queryInterface.removeColumn('invoice_items', 'tax_amount');
    await queryInterface.removeColumn('invoice_items', 'tax_rate');
    await queryInterface.removeColumn('invoice_items', 'tax_included');
    await queryInterface.removeColumn('invoice_items', 'tax_enabled');
    await queryInterface.removeColumn('invoice_items', 'tenancy_id');
    await queryInterface.removeColumn('invoice_items', 'property_id');
    await queryInterface.removeColumn('invoice_items', 'provider_id');
    await queryInterface.removeColumn('invoice_items', 'account_category_id');
    await queryInterface.removeColumn('invoices', 'tax_amount');
    await queryInterface.removeColumn('invoices', 'tax_rate');
    await queryInterface.removeColumn('invoices', 'tax_included');
    await queryInterface.removeColumn('invoices', 'tax_enabled');
    await queryInterface.removeColumn('invoices', 'service_period_end');
    await queryInterface.removeColumn('invoices', 'service_period_start');
    await queryInterface.removeColumn('invoices', 'service_for');
    await queryInterface.removeColumn('invoices', 'billed_to_type');
    await queryInterface.removeColumn('invoices', 'account_category_id');
    await queryInterface.removeColumn('invoices', 'folio_id');
    await queryInterface.dropTable('folio_transactions');
    await queryInterface.dropTable('folios');
    await queryInterface.dropTable('account_categories');
  },
};
