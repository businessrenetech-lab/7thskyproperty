'use strict';

/**
 * 0013 — Tenancies (Property Management rentals) + Property Deals (buy/sell).
 *
 * tenancies      : owner/tenant, move-in/out, security deposit, rent, service
 *                  charge, due day — powers the Property Management list.
 * property_deals : buyer/seller, agreement start, commission, expenses,
 *                  settlement, status — powers Residential/Commercial Buy & Sell.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, ENUM, DECIMAL, DATE, DATEONLY } = Sequelize;
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    const fkUser = { type: INTEGER, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' };
    const fkBranch = { type: INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onDelete: 'RESTRICT' };
    const nf = (table) => ({ type: INTEGER, references: { model: table, key: 'id' }, onDelete: 'SET NULL' });
    const money = { type: DECIMAL(15, 2), defaultValue: 0 };

    await queryInterface.createTable('tenancies', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: fkBranch,
      tenancy_code: { type: STRING(40), unique: true },
      property_id: nf('properties'),
      owner_contact_id: nf('contacts'),
      tenant_contact_id: nf('contacts'),
      lease_start: { type: DATEONLY },
      move_in_date: { type: DATEONLY },
      lease_end: { type: DATEONLY },
      move_out_date: { type: DATEONLY },
      security_deposit: money,
      monthly_rent: money,
      service_charge: money,
      rent_due_day: { type: INTEGER, defaultValue: 1 },   // day of month rent is due
      payment_frequency: { type: ENUM('monthly', 'quarterly', 'half_yearly', 'yearly'), defaultValue: 'monthly' },
      status: { type: ENUM('upcoming', 'active', 'ended', 'terminated'), defaultValue: 'active' },
      notes: { type: TEXT },
      created_by: fkUser,
      ...ts,
    });

    await queryInterface.createTable('property_deals', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: fkBranch,
      deal_code: { type: STRING(40), unique: true },
      property_id: nf('properties'),
      deal_type: { type: ENUM('buy', 'sell'), allowNull: false },
      buyer_client_id: nf('clients'),
      seller_contact_id: nf('contacts'),
      owner_contact_id: nf('contacts'),
      agreement_id: nf('agreements'),
      agreement_date: { type: DATEONLY },
      sale_price: money,
      commission_amount: money,
      commission_percent: { type: DECIMAL(6, 2) },
      expenses_total: money,
      status: { type: ENUM('lead', 'negotiation', 'agreed', 'settlement', 'completed', 'cancelled'), defaultValue: 'lead' },
      settlement_date: { type: DATEONLY },
      assigned_to: fkUser,
      notes: { type: TEXT },
      created_by: fkUser,
      ...ts,
    });

    await queryInterface.addIndex('tenancies', ['branch_id', 'status']);
    await queryInterface.addIndex('tenancies', ['property_id']);
    await queryInterface.addIndex('property_deals', ['branch_id', 'deal_type', 'status']);
    await queryInterface.addIndex('property_deals', ['property_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('property_deals');
    await queryInterface.dropTable('tenancies');
  },
};
