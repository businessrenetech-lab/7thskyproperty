'use strict';

/**
 * Migration 0131: Business Sale module — Phase 3 (transaction spine).
 *   - business_inspections : SOP Step 14–15 buyer meetings / operational
 *                            walkthroughs and their records.
 *   - business_offers      : SOP Step 16–18 offers, counteroffers, and
 *                            non-circumvention monitoring.
 *   - business_settlements : SOP Step 22–24 sale price, commission calculation,
 *                            ownership transfer / handover and commission
 *                            collection.
 * Idempotent: guarded by table existence.
 */
module.exports = {
  up: async (queryInterface, S) => {
    const existing = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName).toLowerCase());
    const stamps = {
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    };

    if (!existing.includes('business_inspections')) {
      await queryInterface.createTable('business_inspections', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        business_listing_id: { type: S.INTEGER, allowNull: false },
        business_enquiry_id: S.INTEGER,
        inspection_type: { type: S.STRING(30), defaultValue: 'walkthrough' }, // walkthrough / meeting / operational
        scheduled_date: S.DATE,
        attendees: S.STRING,
        outcome: S.STRING(30),  // interested / not_interested / follow_up / offer_expected
        feedback: S.TEXT,
        status: { type: S.STRING(20), defaultValue: 'scheduled' }, // scheduled / completed / cancelled
        notes: S.TEXT,
        created_by: S.INTEGER,
        ...stamps,
      });
      await queryInterface.addIndex('business_inspections', ['business_listing_id']);
    }

    if (!existing.includes('business_offers')) {
      await queryInterface.createTable('business_offers', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        offer_code: { type: S.STRING(40), unique: true },
        business_listing_id: { type: S.INTEGER, allowNull: false },
        business_enquiry_id: S.INTEGER,
        buyer_contact_id: S.INTEGER,
        buyer_name: S.STRING,
        offer_amount: S.DECIMAL(16, 2),
        offer_date: S.DATEONLY,
        conditions: S.TEXT,
        operational_transition: S.TEXT,
        settlement_terms: S.TEXT,
        status: { type: S.STRING(20), defaultValue: 'submitted' }, // submitted / under_review / countered / accepted / rejected / withdrawn
        counter_amount: S.DECIMAL(16, 2),
        counter_notes: S.TEXT,
        non_circumvention_flag: { type: S.BOOLEAN, defaultValue: false }, // Step 18 bypass risk
        notes: S.TEXT,
        created_by: S.INTEGER,
        ...stamps,
      });
      await queryInterface.addIndex('business_offers', ['business_listing_id']);
      await queryInterface.addIndex('business_offers', ['status']);
    }

    if (!existing.includes('business_settlements')) {
      await queryInterface.createTable('business_settlements', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        settlement_code: { type: S.STRING(40), unique: true },
        business_listing_id: { type: S.INTEGER, allowNull: false },
        offer_id: S.INTEGER,
        buyer_contact_id: S.INTEGER,
        agreed_sale_price: S.DECIMAL(16, 2),
        commission_mode: { type: S.STRING(12), defaultValue: 'percent' }, // percent / fixed
        commission_percent: { type: S.DECIMAL(6, 3), defaultValue: 2 },
        commission_amount: S.DECIMAL(16, 2),
        deposit_amount: S.DECIMAL(16, 2),
        balance_amount: S.DECIMAL(16, 2),
        ownership_transfer_status: { type: S.STRING(20), defaultValue: 'pending' }, // pending / in_progress / completed
        handover_status: { type: S.STRING(20), defaultValue: 'pending' }, // pending / completed
        handover_date: S.DATEONLY,
        settlement_date: S.DATEONLY,
        commission_status: { type: S.STRING(20), defaultValue: 'pending' }, // pending / invoiced / collected
        commission_collected_at: S.DATE,
        status: { type: S.STRING(20), defaultValue: 'open' }, // open / completed
        notes: S.TEXT,
        created_by: S.INTEGER,
        ...stamps,
      });
      await queryInterface.addIndex('business_settlements', ['business_listing_id']);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('business_settlements').catch(() => {});
    await queryInterface.dropTable('business_offers').catch(() => {});
    await queryInterface.dropTable('business_inspections').catch(() => {});
  },
};
