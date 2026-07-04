'use strict';

/**
 * 0003 — Service catalog: hierarchical categories/subcategories + services.
 * Supports hover descriptions, page content, icons/images, SEO, visibility &
 * hidden-at-launch toggles (Solar / AC / Water Tank), and lead-form binding.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, BOOLEAN, DECIMAL, DATE } = Sequelize;
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };

    // ── service_categories (self-referential hierarchy) ─────────────────────
    await queryInterface.createTable('service_categories', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      parent_id: {
        type: INTEGER, allowNull: true,
        references: { model: 'service_categories', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      // Top-level grouping key (helps the website route to the right hub page)
      vertical_key: { type: STRING(40) },  // properties | property_care | leasing | removal | documentation | nrb | interior | solar | ac | water_tank
      name: { type: STRING, allowNull: false },
      slug: { type: STRING, allowNull: false, unique: true },
      description: { type: TEXT },
      hover_description: { type: STRING(255) },   // 10–15 word professional explanation
      icon: { type: STRING },
      image_url: { type: STRING },
      seo_title: { type: STRING },
      seo_description: { type: STRING(500) },
      sort_order: { type: INTEGER, defaultValue: 0 },
      is_active: { type: BOOLEAN, defaultValue: true },
      is_hidden: { type: BOOLEAN, defaultValue: false },  // hidden-at-launch (admin can activate)
      ...ts,
    });

    // ── services ────────────────────────────────────────────────────────────
    await queryInterface.createTable('services', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      category_id: {
        type: INTEGER, allowNull: false,
        references: { model: 'service_categories', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      name: { type: STRING, allowNull: false },
      slug: { type: STRING, allowNull: false, unique: true },
      hover_description: { type: STRING(255) },   // "10–15 word professional explanation..."
      summary: { type: TEXT },
      page_content: { type: TEXT('long') },
      icon: { type: STRING },
      image_url: { type: STRING },
      seo_title: { type: STRING },
      seo_description: { type: STRING(500) },
      base_price: { type: DECIMAL(12, 2) },
      price_unit: { type: STRING(40) },           // per visit, per sqft, monthly, quote-based...
      lead_form_enabled: { type: BOOLEAN, defaultValue: true },
      sort_order: { type: INTEGER, defaultValue: 0 },
      is_active: { type: BOOLEAN, defaultValue: true },
      is_hidden: { type: BOOLEAN, defaultValue: false },
      ...ts,
    });

    await queryInterface.addIndex('service_categories', ['parent_id']);
    await queryInterface.addIndex('service_categories', ['vertical_key']);
    await queryInterface.addIndex('service_categories', ['is_active', 'is_hidden']);
    await queryInterface.addIndex('services', ['category_id']);
    await queryInterface.addIndex('services', ['is_active', 'is_hidden']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('services');
    await queryInterface.dropTable('service_categories');
  },
};
