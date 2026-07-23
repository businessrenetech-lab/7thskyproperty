'use strict';

/**
 * 0029 — Property Care Services catalog.
 *
 *  care_service_categories — an arbitrary-depth tree (parent_id self-ref) grouping a
 *  service vertical (e.g. water_tank) into Category → Sub-category → … .
 *
 *  care_services — the billable services that live under a category. Each carries
 *  its fee model + Seventh Sky's fee/commission + how the provider is paid, so a
 *  work order can price itself and split income vs. provider payable.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, DECIMAL, ENUM, BOOLEAN, DATE, JSON: JSONT } = Sequelize;
    const qi = queryInterface;
    const stamps = {
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    };
    const has = async (t) => { try { await qi.describeTable(t); return true; } catch { return false; } };

    if (!(await has('care_service_categories'))) {
      await qi.createTable('care_service_categories', {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: INTEGER },
        parent_id: { type: INTEGER },
        vertical: { type: STRING(60), defaultValue: 'general' },   // e.g. water_tank
        name: { type: STRING, allowNull: false },
        code: { type: STRING(60) },
        slug: { type: STRING(120) },
        description: { type: TEXT },
        icon: { type: STRING(60) },
        sort_order: { type: INTEGER, defaultValue: 0 },
        is_active: { type: BOOLEAN, defaultValue: true },
        created_by: { type: INTEGER },
        ...stamps,
      });
      await qi.addIndex('care_service_categories', ['vertical'], { name: 'idx_svc_cat_vertical' });
      await qi.addIndex('care_service_categories', ['parent_id'], { name: 'idx_svc_cat_parent' });
    }

    if (!(await has('care_services'))) {
      await qi.createTable('care_services', {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: INTEGER },
        category_id: { type: INTEGER },
        vertical: { type: STRING(60), defaultValue: 'general' },
        name: { type: STRING, allowNull: false },
        code: { type: STRING(60) },
        description: { type: TEXT },
        service_group: { type: STRING(60) },     // residential / commercial / repair / water_quality / amc
        // Pricing / fee model
        fee_model: { type: ENUM('fixed', 'quote', 'hourly', 'per_visit', 'call_out', 'amc'), defaultValue: 'quote' },
        base_price: { type: DECIMAL(15, 2), defaultValue: 0 },
        unit: { type: STRING(40) },              // per tank / per visit / per hour …
        // Seventh Sky's cut (our income) and how the provider is paid
        sspc_fee_type: { type: ENUM('percentage', 'fixed'), defaultValue: 'percentage' },
        sspc_fee_value: { type: DECIMAL(12, 2), defaultValue: 0 },
        provider_pay_type: { type: ENUM('percentage', 'fixed', 'remainder'), defaultValue: 'remainder' },
        provider_pay_value: { type: DECIMAL(12, 2), defaultValue: 0 },
        // Who can deliver + where it applies
        delivery_mode: { type: ENUM('provider', 'internal', 'either'), defaultValue: 'either' },
        applicable_to: { type: JSONT, defaultValue: null }, // ['property_management','standalone']
        requires_site_assessment: { type: BOOLEAN, defaultValue: false },
        tags: { type: JSONT, defaultValue: null },
        is_active: { type: BOOLEAN, defaultValue: true },
        sort_order: { type: INTEGER, defaultValue: 0 },
        notes: { type: TEXT },
        created_by: { type: INTEGER },
        ...stamps,
      });
      await qi.addIndex('care_services', ['vertical'], { name: 'idx_svc_item_vertical' });
      await qi.addIndex('care_services', ['category_id'], { name: 'idx_svc_item_category' });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('care_services').catch(() => {});
    await queryInterface.dropTable('care_service_categories').catch(() => {});
  },
};
