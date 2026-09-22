'use strict';

/**
 * Migration 0142: property_business_profiles — one row per business property
 * (properties.category = 'business'). Business Sale SOP Steps 1, 6, 8, 9: the
 * business profile, website teaser copy and the preparation checklist.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const tables = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName).toLowerCase());
    if (tables.includes('property_business_profiles')) return;
    await queryInterface.createTable('property_business_profiles', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: S.INTEGER, allowNull: false },
      property_id: { type: S.INTEGER, allowNull: false, unique: true },
      business_type: S.STRING(30),
      industry: S.STRING(120),
      ownership_structure: S.STRING(60),
      company_registration_no: S.STRING(80),
      trade_licence_no: S.STRING(80),
      tin_bin: S.STRING(80),
      year_established: S.INTEGER,
      staff_count: S.INTEGER,
      lease_status: S.STRING(20),
      lease_details: S.TEXT,
      reason_for_sale: S.TEXT,
      annual_turnover: S.DECIMAL(16, 2),
      annual_profit: S.DECIMAL(16, 2),
      monthly_revenue: S.DECIMAL(16, 2),
      included_assets: S.TEXT,
      stock_info: S.TEXT,
      employee_info: S.TEXT,
      ip_details: S.TEXT,
      teaser_headline: S.STRING(160),
      teaser_summary: S.TEXT,
      preparation: S.JSON,
      created_by: S.INTEGER,
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('property_business_profiles', ['branch_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('property_business_profiles').catch(() => {});
  },
};
