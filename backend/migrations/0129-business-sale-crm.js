'use strict';

/**
 * Migration 0129: Business Sale module — core CRM tables.
 *
 * A business is not a property, so the Business Sale console has its own subject
 * model. Two tables:
 *   - business_listings  : a business offered for sale (SOP Step 1 seller intake
 *                          + Schedule B of SSPC-BSS-01) and its pipeline stage.
 *   - business_enquiries : buyer / investor leads (SOP Step 11 + workflow "Lead
 *                          Intake"), optionally against a specific listing.
 * Idempotent: skips creation when the table already exists.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const existing = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName).toLowerCase());

    if (!existing.includes('business_listings')) {
      await queryInterface.createTable('business_listings', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        business_code: { type: S.STRING(40), unique: true },
        listing_type: { type: S.STRING(20), defaultValue: 'sale' }, // sale (sell-side listing)
        // Identity & classification (SOP Step 1)
        business_name: { type: S.STRING, allowNull: false },
        business_type: S.STRING(60),   // retail / restaurant / hospitality / manufacturing / service / trading / industrial / franchise / online / other
        industry: S.STRING(80),
        business_address: S.STRING,
        area: S.STRING, city: S.STRING, district: S.STRING,
        // Ownership & compliance
        ownership_structure: S.STRING(80), // sole proprietor / partnership / private limited / etc.
        company_registration_no: S.STRING(80),
        trade_licence_no: S.STRING(80),
        tin_bin: S.STRING(80),
        // Operations
        year_established: S.INTEGER,
        staff_count: S.INTEGER,
        lease_status: S.STRING(20),    // owned / leased / na
        lease_details: S.TEXT,
        // Sale economics (Schedule B)
        reason_for_sale: S.TEXT,
        indicative_price: S.DECIMAL(16, 2),
        currency: { type: S.STRING(8), defaultValue: 'BDT' },
        annual_turnover: S.DECIMAL(16, 2),
        annual_profit: S.DECIMAL(16, 2),
        monthly_revenue: S.DECIMAL(16, 2),
        included_assets: S.TEXT,
        stock_info: S.TEXT,
        employee_info: S.TEXT,
        ip_details: S.TEXT,
        // Presentation
        description: S.TEXT,
        highlights: S.TEXT,
        confidential: { type: S.BOOLEAN, defaultValue: true },
        // Parties & workflow
        seller_contact_id: S.INTEGER,
        assigned_to: S.INTEGER,
        stage: { type: S.STRING(40), defaultValue: 'lead_intake' }, // SOP pipeline stage
        status: { type: S.STRING(30), defaultValue: 'active' },     // active / under_offer / sold / withdrawn / on_hold
        special_requirements: S.TEXT,
        commencement_date: S.DATEONLY,
        completion_date: S.DATEONLY,
        created_by: S.INTEGER,
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('business_listings', ['branch_id']);
      await queryInterface.addIndex('business_listings', ['stage']);
      await queryInterface.addIndex('business_listings', ['status']);
      await queryInterface.addIndex('business_listings', ['seller_contact_id']);
    }

    if (!existing.includes('business_enquiries')) {
      await queryInterface.createTable('business_enquiries', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        enquiry_code: { type: S.STRING(40), unique: true },
        business_listing_id: S.INTEGER,       // optional — a specific listing, else a general buyer requirement
        enquiry_type: { type: S.STRING(20), defaultValue: 'buyer' }, // buyer / investor / seller
        enquirer_name: S.STRING,
        company_name: S.STRING,
        phone: S.STRING,
        email: S.STRING,
        interest: S.STRING,     // preferred business type / industry
        preferred_industry: S.STRING(80),
        preferred_location: S.STRING,
        budget: S.DECIMAL(16, 2),
        source: S.STRING,
        message: S.TEXT,
        // Buyer screening (SOP Step 12)
        buyer_seriousness: S.STRING(30),      // high / medium / low
        financial_capability: S.STRING(30),   // verified / claimed / unknown
        // Pipeline
        stage: { type: S.STRING(30), defaultValue: 'new' }, // new / screening / qualified / inspection / negotiation / closed / lost
        assigned_to: S.INTEGER,
        contact_id: S.INTEGER,                 // links to contacts (category='business')
        converted: { type: S.BOOLEAN, defaultValue: false },
        next_action: S.STRING,
        follow_up_date: S.DATEONLY,
        notes: S.TEXT,
        created_by: S.INTEGER,
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('business_enquiries', ['branch_id']);
      await queryInterface.addIndex('business_enquiries', ['stage']);
      await queryInterface.addIndex('business_enquiries', ['business_listing_id']);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('business_enquiries').catch(() => {});
    await queryInterface.dropTable('business_listings').catch(() => {});
  },
};
