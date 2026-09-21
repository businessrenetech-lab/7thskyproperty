'use strict';

/**
 * Migration 0135: Business Rent — Phase 4 (ongoing lease management).
 *   - business_leases          : executed lease terms for a rent listing.
 *   - business_rent_collections: the monthly rent schedule + collection.
 *   - business_maintenance     : SOP Step 16 maintenance requests log.
 * Idempotent: guarded by table existence.
 */
module.exports = {
  up: async (queryInterface, S) => {
    const existing = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName).toLowerCase());
    const stamps = {
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    };

    if (!existing.includes('business_leases')) {
      await queryInterface.createTable('business_leases', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        lease_code: { type: S.STRING(40), unique: true },
        business_listing_id: { type: S.INTEGER, allowNull: false },
        tenant_contact_id: S.INTEGER,
        tenant_name: S.STRING,
        monthly_rent: S.DECIMAL(16, 2),
        security_deposit: S.DECIMAL(16, 2),
        service_charge: S.DECIMAL(16, 2),
        lease_start: S.DATEONLY,
        lease_end: S.DATEONLY,
        lease_term_months: S.INTEGER,
        rent_due_day: { type: S.INTEGER, defaultValue: 1 },
        rent_review_structure: S.STRING(120),
        commission_amount: S.DECIMAL(16, 2),
        status: { type: S.STRING(20), defaultValue: 'active' }, // active / renewed / expired / terminated
        notes: S.TEXT,
        created_by: S.INTEGER,
        ...stamps,
      });
      await queryInterface.addIndex('business_leases', ['business_listing_id']);
      await queryInterface.addIndex('business_leases', ['branch_id']);
      await queryInterface.addIndex('business_leases', ['status']);
    }

    if (!existing.includes('business_rent_collections')) {
      await queryInterface.createTable('business_rent_collections', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        lease_id: { type: S.INTEGER, allowNull: false },
        business_listing_id: S.INTEGER,
        period_label: S.STRING(7),   // YYYY-MM
        due_date: S.DATEONLY,
        rent_due: S.DECIMAL(16, 2),
        rent_received: { type: S.DECIMAL(16, 2), defaultValue: 0 },
        status: { type: S.STRING(20), defaultValue: 'due' }, // due / paid / partial / overdue / waived
        paid_date: S.DATEONLY,
        method: S.STRING(30),
        notes: S.TEXT,
        created_by: S.INTEGER,
        ...stamps,
      });
      await queryInterface.addIndex('business_rent_collections', ['lease_id']);
      await queryInterface.addIndex('business_rent_collections', ['branch_id']);
    }

    if (!existing.includes('business_maintenance')) {
      await queryInterface.createTable('business_maintenance', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        business_listing_id: { type: S.INTEGER, allowNull: false },
        lease_id: S.INTEGER,
        title: S.STRING,
        description: S.TEXT,
        reported_date: S.DATEONLY,
        priority: { type: S.STRING(20), defaultValue: 'medium' }, // low / medium / high
        status: { type: S.STRING(20), defaultValue: 'open' },     // open / in_progress / resolved
        cost: S.DECIMAL(16, 2),
        vendor: S.STRING,
        resolved_date: S.DATEONLY,
        notes: S.TEXT,
        created_by: S.INTEGER,
        ...stamps,
      });
      await queryInterface.addIndex('business_maintenance', ['business_listing_id']);
      await queryInterface.addIndex('business_maintenance', ['branch_id']);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('business_maintenance').catch(() => {});
    await queryInterface.dropTable('business_rent_collections').catch(() => {});
    await queryInterface.dropTable('business_leases').catch(() => {});
  },
};
