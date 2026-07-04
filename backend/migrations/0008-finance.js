'use strict';

/**
 * 0008 — Property-care financial module.
 * Quotations, invoices (client & provider), payments, owner disbursements,
 * rental ledger and property expenses. Statuses per the proposal.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, BOOLEAN, ENUM, DECIMAL, DATE, DATEONLY } = Sequelize;
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    const fkUser = (allowNull = true) => ({ type: INTEGER, allowNull, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' });
    const fkBranch = { type: INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' };
    const nf = (table) => ({ type: INTEGER, references: { model: table, key: 'id' }, onDelete: 'SET NULL' });
    const money = (def = null) => ({ type: DECIMAL(15, 2), defaultValue: def });

    // ── quotations ──────────────────────────────────────────────────────────
    await queryInterface.createTable('quotations', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: fkBranch,
      quote_code: { type: STRING(40), unique: true },
      client_id: nf('clients'),
      contact_id: nf('contacts'),
      project_id: nf('projects'),
      property_id: nf('properties'),
      service_id: nf('services'),
      title: { type: STRING },
      status: { type: ENUM('draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled'), defaultValue: 'draft' },
      subtotal: money(0), discount: money(0), tax: money(0), total: money(0),
      currency: { type: STRING(8), defaultValue: 'BDT' },
      valid_until: { type: DATEONLY },
      terms: { type: TEXT },
      notes: { type: TEXT },
      created_by: fkUser(true),
      ...ts,
    });
    await queryInterface.createTable('quotation_items', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      quotation_id: { type: INTEGER, allowNull: false, references: { model: 'quotations', key: 'id' }, onDelete: 'CASCADE' },
      description: { type: STRING, allowNull: false },
      quantity: { type: DECIMAL(12, 2), defaultValue: 1 },
      unit: { type: STRING(40) },
      unit_price: money(0),
      amount: money(0),
      sort_order: { type: INTEGER, defaultValue: 0 },
      ...ts,
    });

    // ── invoices (client & provider) ─────────────────────────────────────────
    await queryInterface.createTable('invoices', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: fkBranch,
      invoice_code: { type: STRING(40), unique: true },
      invoice_kind: { type: ENUM('client', 'provider'), defaultValue: 'client' },
      client_id: nf('clients'),
      contact_id: nf('contacts'),
      provider_id: nf('service_providers'),
      project_id: nf('projects'),
      work_order_id: nf('work_orders'),
      quotation_id: nf('quotations'),
      property_id: nf('properties'),
      title: { type: STRING },
      status: { type: ENUM('draft', 'sent', 'pending', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'), defaultValue: 'draft' },
      subtotal: money(0), discount: money(0), tax: money(0), total: money(0),
      amount_paid: money(0), balance: money(0),
      currency: { type: STRING(8), defaultValue: 'BDT' },
      issue_date: { type: DATEONLY },
      due_date: { type: DATEONLY },
      notes: { type: TEXT },
      created_by: fkUser(true),
      ...ts,
    });
    await queryInterface.createTable('invoice_items', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      invoice_id: { type: INTEGER, allowNull: false, references: { model: 'invoices', key: 'id' }, onDelete: 'CASCADE' },
      description: { type: STRING, allowNull: false },
      quantity: { type: DECIMAL(12, 2), defaultValue: 1 },
      unit: { type: STRING(40) },
      unit_price: money(0),
      amount: money(0),
      sort_order: { type: INTEGER, defaultValue: 0 },
      ...ts,
    });

    // ── payments ──────────────────────────────────────────────────────────
    await queryInterface.createTable('payments', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: fkBranch,
      payment_code: { type: STRING(40), unique: true },
      invoice_id: nf('invoices'),
      client_id: nf('clients'),
      direction: { type: ENUM('incoming', 'outgoing'), defaultValue: 'incoming' }, // incoming=client pays, outgoing=pay provider/owner
      amount: money(0),
      method: { type: ENUM('cash', 'bank_transfer', 'bkash', 'nagad', 'card', 'cheque', 'sslcommerz', 'other'), defaultValue: 'cash' },
      reference: { type: STRING },
      status: { type: ENUM('pending', 'completed', 'failed', 'refunded'), defaultValue: 'completed' },
      paid_at: { type: DATE },
      notes: { type: TEXT },
      recorded_by: fkUser(true),
      ...ts,
    });

    // ── owner_disbursements ───────────────────────────────────────────────
    await queryInterface.createTable('owner_disbursements', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: fkBranch,
      disbursement_code: { type: STRING(40), unique: true },
      owner_contact_id: nf('contacts'),
      property_id: nf('properties'),
      period_start: { type: DATEONLY },
      period_end: { type: DATEONLY },
      gross_rent: money(0),
      total_deductions: money(0),
      management_fee: money(0),
      net_payable: money(0),
      status: { type: ENUM('draft', 'approved', 'paid'), defaultValue: 'draft' },
      paid_at: { type: DATE },
      notes: { type: TEXT },
      created_by: fkUser(true),
      ...ts,
    });

    // ── rental_ledger ─────────────────────────────────────────────────────
    await queryInterface.createTable('rental_ledger', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: fkBranch,
      property_id: nf('properties'),
      tenant_contact_id: nf('contacts'),
      owner_contact_id: nf('contacts'),
      period_label: { type: STRING(20) },   // e.g. 2026-06
      rent_due: money(0),
      rent_received: money(0),
      due_date: { type: DATEONLY },
      received_date: { type: DATEONLY },
      status: { type: ENUM('due', 'partial', 'paid', 'overdue', 'arrears'), defaultValue: 'due' },
      notes: { type: TEXT },
      ...ts,
    });

    // ── property_expenses (job costing / property spend) ────────────────────
    await queryInterface.createTable('property_expenses', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: fkBranch,
      property_id: nf('properties'),
      project_id: nf('projects'),
      work_order_id: nf('work_orders'),
      category: { type: STRING },
      description: { type: STRING },
      amount: money(0),
      expense_date: { type: DATEONLY },
      reimbursable: { type: BOOLEAN, defaultValue: false },
      billable_to_owner: { type: BOOLEAN, defaultValue: false },
      status: { type: ENUM('pending', 'approved', 'rejected', 'reimbursed'), defaultValue: 'pending' },
      receipt_url: { type: STRING },
      recorded_by: fkUser(true),
      ...ts,
    });

    await queryInterface.addIndex('quotations', ['branch_id', 'status']);
    await queryInterface.addIndex('quotation_items', ['quotation_id']);
    await queryInterface.addIndex('invoices', ['branch_id', 'status']);
    await queryInterface.addIndex('invoices', ['invoice_kind']);
    await queryInterface.addIndex('invoice_items', ['invoice_id']);
    await queryInterface.addIndex('payments', ['invoice_id']);
    await queryInterface.addIndex('owner_disbursements', ['property_id']);
    await queryInterface.addIndex('rental_ledger', ['property_id', 'period_label']);
    await queryInterface.addIndex('property_expenses', ['property_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('property_expenses');
    await queryInterface.dropTable('rental_ledger');
    await queryInterface.dropTable('owner_disbursements');
    await queryInterface.dropTable('payments');
    await queryInterface.dropTable('invoice_items');
    await queryInterface.dropTable('invoices');
    await queryInterface.dropTable('quotation_items');
    await queryInterface.dropTable('quotations');
  },
};
