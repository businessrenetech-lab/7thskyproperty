'use strict';

/**
 * Migration 0133: Business Sale module — Phase 5 (acquisition side).
 *   - business_mandates : a buyer's acquisition brief (Business Purchase SOP —
 *     buyer requirements, search & shortlisting) and its pipeline stage.
 *   - business_targets  : candidate businesses shortlisted for a mandate.
 * Idempotent: guarded by table existence.
 */
module.exports = {
  up: async (queryInterface, S) => {
    const existing = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName).toLowerCase());
    const stamps = {
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    };

    if (!existing.includes('business_mandates')) {
      await queryInterface.createTable('business_mandates', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        mandate_code: { type: S.STRING(40), unique: true },
        buyer_contact_id: S.INTEGER,
        buyer_name: S.STRING,
        buyer_company: S.STRING,
        preferred_business_type: S.STRING(60),
        preferred_industry: S.STRING(80),
        preferred_location: S.STRING,
        budget_min: S.DECIMAL(16, 2),
        budget_max: S.DECIMAL(16, 2),
        purchase_purpose: S.STRING(40),   // owner_operator / investment / expansion / other
        financing_status: S.STRING(40),   // cash / needs_finance / pre_approved
        requirements: S.TEXT,
        timeline: S.STRING(60),
        stage: { type: S.STRING(40), defaultValue: 'consultation' }, // consultation / search / shortlisting / inspection / negotiation / due_diligence / agreement / settlement / closure
        status: { type: S.STRING(30), defaultValue: 'active' },      // active / on_hold / completed / withdrawn
        assigned_to: S.INTEGER,
        notes: S.TEXT,
        created_by: S.INTEGER,
        ...stamps,
      });
      await queryInterface.addIndex('business_mandates', ['branch_id']);
      await queryInterface.addIndex('business_mandates', ['stage']);
      await queryInterface.addIndex('business_mandates', ['status']);
    }

    if (!existing.includes('business_targets')) {
      await queryInterface.createTable('business_targets', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        mandate_id: { type: S.INTEGER, allowNull: false },
        business_listing_id: S.INTEGER,   // optional — if the target is one of our own listings
        business_name: { type: S.STRING, allowNull: false },
        business_type: S.STRING(60),
        industry: S.STRING(80),
        location: S.STRING,
        source: S.STRING,
        asking_price: S.DECIMAL(16, 2),
        fit_score: S.INTEGER,             // 1..5
        status: { type: S.STRING(30), defaultValue: 'identified' }, // identified / shortlisted / contacted / inspected / offer_made / under_negotiation / rejected / acquired
        contact_info: S.STRING,
        notes: S.TEXT,
        created_by: S.INTEGER,
        ...stamps,
      });
      await queryInterface.addIndex('business_targets', ['mandate_id']);
      await queryInterface.addIndex('business_targets', ['branch_id']);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('business_targets').catch(() => {});
    await queryInterface.dropTable('business_mandates').catch(() => {});
  },
};
