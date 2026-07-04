'use strict';

/**
 * 0015 — Property owner management:
 *   1. Add manager_id to properties (separate from listing_agent_id)
 *   2. property_owner_profiles — KYC, banking, disbursement settings per owner
 *   3. owner_fee_schedules — our management charges per owner/property
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, DECIMAL, ENUM, BOOLEAN, TEXT, DATEONLY, DATE } = Sequelize;

    // 1. manager_id on properties
    await queryInterface.addColumn('properties', 'manager_id', {
      type: INTEGER, allowNull: true,
      references: { model: 'contacts', key: 'id' }, onDelete: 'SET NULL',
    });

    // 2. Owner KYC + banking + disbursement
    await queryInterface.createTable('property_owner_profiles', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      property_id: { type: INTEGER, allowNull: false, references: { model: 'properties', key: 'id' }, onDelete: 'CASCADE' },
      contact_id: { type: INTEGER, allowNull: false, references: { model: 'contacts', key: 'id' }, onDelete: 'CASCADE' },
      // KYC
      nid_number: { type: STRING(20) },
      tin_number: { type: STRING(20) },
      passport_number: { type: STRING(30) },
      nid_front_url: { type: STRING },
      nid_back_url: { type: STRING },
      // Banking
      bank_name: { type: STRING },
      bank_branch: { type: STRING },
      bank_account_name: { type: STRING },
      bank_account_number: { type: STRING(30) },
      bank_routing_number: { type: STRING(20) },
      bkash_number: { type: STRING(20) },
      nagad_number: { type: STRING(20) },
      preferred_payment: { type: ENUM('cash', 'bank_transfer', 'bkash', 'nagad', 'cheque'), defaultValue: 'bank_transfer' },
      // Disbursement
      disbursement_frequency: { type: ENUM('weekly', 'fortnightly', 'monthly', 'quarterly'), defaultValue: 'monthly' },
      disbursement_day: { type: INTEGER, defaultValue: 1 },
      next_disbursement_date: { type: DATEONLY },
      opening_balance: { type: DECIMAL(15, 2), defaultValue: 0 },
      notes: { type: TEXT },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    // 3. Fee schedule (our charges)
    await queryInterface.createTable('owner_fee_schedules', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      property_id: { type: INTEGER, references: { model: 'properties', key: 'id' }, onDelete: 'CASCADE' },
      owner_profile_id: { type: INTEGER, allowNull: false, references: { model: 'property_owner_profiles', key: 'id' }, onDelete: 'CASCADE' },
      fee_name: { type: STRING, allowNull: false },
      fee_category: { type: STRING },
      fee_trigger: { type: ENUM('manual', 'first_rent', 'rental_receipt', 'invoice_receipt', 'renewal', 'statement_period'), defaultValue: 'manual' },
      amount_type: { type: ENUM('fixed', 'percentage'), defaultValue: 'percentage' },
      amount_value: { type: DECIMAL(10, 2), defaultValue: 0 },
      notes: { type: TEXT },
      is_active: { type: BOOLEAN, defaultValue: true },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('owner_fee_schedules');
    await queryInterface.dropTable('property_owner_profiles');
    await queryInterface.removeColumn('properties', 'manager_id');
  },
};
