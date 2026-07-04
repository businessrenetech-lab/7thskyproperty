'use strict';

/**
 * 0004 — Property listing system: properties + media gallery + documents.
 * Mirrors international real-estate listing fields and links owner/tenant
 * contacts. Inspection history is linked later via the inspections table.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, BOOLEAN, ENUM, JSON, DECIMAL, DATE } = Sequelize;
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    const fkUser = (allowNull = true) => ({
      type: INTEGER, allowNull,
      references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
    });
    const fkContact = (allowNull = true) => ({
      type: INTEGER, allowNull,
      references: { model: 'contacts', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
    });

    // ── properties ───────────────────────────────────────────────────────────
    await queryInterface.createTable('properties', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: {
        type: INTEGER, allowNull: false,
        references: { model: 'branches', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      property_code: { type: STRING(40), unique: true },     // SSPC-PR-000123
      title: { type: STRING, allowNull: false },
      slug: { type: STRING, unique: true },
      // Classification
      category: { type: ENUM('residential', 'commercial', 'rural', 'business'), allowNull: false },
      property_type: { type: STRING },                       // Apartment, House, Land, Office, Shop, Warehouse...
      listing_type: { type: ENUM('sale', 'rent', 'lease', 'short_term'), allowNull: false },
      status: {
        type: ENUM('available', 'occupied', 'under_maintenance', 'reserved', 'sold', 'rented', 'inactive', 'draft'),
        defaultValue: 'draft',
      },
      // Pricing
      price: { type: DECIMAL(15, 2) },
      price_unit: { type: STRING(40) },                      // total, per month, per sqft...
      currency: { type: STRING(8), defaultValue: 'BDT' },
      is_negotiable: { type: BOOLEAN, defaultValue: true },
      // Location
      address: { type: TEXT },
      area: { type: STRING },
      city: { type: STRING },
      district: { type: STRING },
      postal_code: { type: STRING(20) },
      country: { type: STRING, defaultValue: 'Bangladesh' },
      latitude: { type: DECIMAL(10, 7) },
      longitude: { type: DECIMAL(10, 7) },
      map_url: { type: TEXT },
      nearby_places: { type: JSON, defaultValue: [] },
      // Specs
      bedrooms: { type: INTEGER },
      bathrooms: { type: INTEGER },
      parking: { type: INTEGER },
      land_size: { type: STRING(60) },
      building_size: { type: STRING(60) },
      floor_number: { type: STRING(20) },
      total_floors: { type: STRING(20) },
      year_built: { type: STRING(10) },
      furnishing: { type: ENUM('unfurnished', 'semi_furnished', 'furnished') },
      features: { type: JSON, defaultValue: [] },
      description: { type: TEXT('long') },
      // Media (primary + gallery handled in property_media)
      featured_image_url: { type: STRING },
      video_tour_url: { type: STRING },
      drone_video_url: { type: STRING },
      floor_plan_url: { type: STRING },
      virtual_tour_url: { type: STRING },
      // Relationships
      owner_contact_id: fkContact(true),
      tenant_contact_id: fkContact(true),
      listing_agent_id: fkUser(true),
      // Publishing & SEO
      is_published: { type: BOOLEAN, defaultValue: false },
      is_featured: { type: BOOLEAN, defaultValue: false },
      seo_title: { type: STRING },
      seo_description: { type: STRING(500) },
      views_count: { type: INTEGER, defaultValue: 0 },
      created_by: fkUser(true),
      ...ts,
    });

    // ── property_media ────────────────────────────────────────────────────────
    await queryInterface.createTable('property_media', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      property_id: {
        type: INTEGER, allowNull: false,
        references: { model: 'properties', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      media_type: { type: ENUM('image', 'video', 'drone', 'floor_plan', 'document'), defaultValue: 'image' },
      file_url: { type: STRING, allowNull: false },
      caption: { type: STRING },
      sort_order: { type: INTEGER, defaultValue: 0 },
      ...ts,
    });

    // ── property_documents ──────────────────────────────────────────────────
    await queryInterface.createTable('property_documents', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      property_id: {
        type: INTEGER, allowNull: false,
        references: { model: 'properties', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      doc_type: { type: STRING },                            // Deed, Mutation, Tax receipt, Lease, Compliance...
      title: { type: STRING },
      file_url: { type: STRING, allowNull: false },
      file_name: { type: STRING },
      is_private: { type: BOOLEAN, defaultValue: true },
      uploaded_by: fkUser(true),
      ...ts,
    });

    await queryInterface.addIndex('properties', ['branch_id']);
    await queryInterface.addIndex('properties', ['category', 'listing_type']);
    await queryInterface.addIndex('properties', ['status']);
    await queryInterface.addIndex('properties', ['is_published', 'is_featured']);
    await queryInterface.addIndex('properties', ['owner_contact_id']);
    await queryInterface.addIndex('property_media', ['property_id']);
    await queryInterface.addIndex('property_documents', ['property_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('property_documents');
    await queryInterface.dropTable('property_media');
    await queryInterface.dropTable('properties');
  },
};
