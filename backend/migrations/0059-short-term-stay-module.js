'use strict';

/**
 * Migration 0059: Short Term Stay Management Module Tables
 * Idempotent migration creating short-stay profiles, owner managements, bookings,
 * occupants, availability blocks, readiness checks, housekeeping, and incidents.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. short_stay_property_profiles
    const tables = await queryInterface.showAllTables();
    
    if (!tables.includes('short_stay_property_profiles')) {
      await queryInterface.createTable('short_stay_property_profiles', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: Sequelize.INTEGER, allowNull: false },
        property_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'properties', key: 'id' },
          onDelete: 'CASCADE',
        },
        public_headline: { type: Sequelize.STRING, allowNull: true },
        public_description: { type: Sequelize.TEXT, allowNull: true },
        accommodation_type: {
          type: Sequelize.STRING(60),
          allowNull: false,
          defaultValue: 'serviced_apartment',
        },
        bedrooms: { type: Sequelize.INTEGER, defaultValue: 1 },
        bathrooms: { type: Sequelize.INTEGER, defaultValue: 1 },
        max_guests: { type: Sequelize.INTEGER, defaultValue: 2 },
        max_adults: { type: Sequelize.INTEGER, defaultValue: 2 },
        max_children: { type: Sequelize.INTEGER, defaultValue: 0 },
        furnishing_status: { type: Sequelize.STRING(40), defaultValue: 'furnished' },
        amenities: { type: Sequelize.JSON, defaultValue: [] },
        base_nightly_rate: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        weekend_rate: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        weekly_rate: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        monthly_rate: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        cleaning_fee: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        security_deposit: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        extra_guest_fee: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        early_checkin_fee: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        late_checkout_fee: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        house_rules: { type: Sequelize.JSON, defaultValue: [] },
        checkin_time: { type: Sequelize.STRING(20), defaultValue: '14:00' },
        checkout_time: { type: Sequelize.STRING(20), defaultValue: '11:00' },
        access_instructions: { type: Sequelize.TEXT, allowNull: true },
        wifi_name: { type: Sequelize.STRING(100), allowNull: true },
        wifi_password: { type: Sequelize.STRING(100), allowNull: true },
        is_website_listed: { type: Sequelize.BOOLEAN, defaultValue: false },
        is_featured_on_website: { type: Sequelize.BOOLEAN, defaultValue: false },
        seo_title: { type: Sequelize.STRING, allowNull: true },
        seo_description: { type: Sequelize.TEXT, allowNull: true },
        public_slug: { type: Sequelize.STRING(150), allowNull: true, unique: true },
        current_occupancy_status: {
          type: Sequelize.ENUM('available', 'booked', 'occupied', 'maintenance_blocked', 'owner_blocked'),
          defaultValue: 'available',
        },
        is_manual_status_override: { type: Sequelize.BOOLEAN, defaultValue: false },
        manual_status_notes: { type: Sequelize.TEXT, allowNull: true },
        status: {
          type: Sequelize.ENUM('draft', 'readiness_pending', 'ready', 'active', 'suspended'),
          defaultValue: 'draft',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });
    }

    // 2. short_stay_owner_managements
    if (!tables.includes('short_stay_owner_managements')) {
      await queryInterface.createTable('short_stay_owner_managements', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: Sequelize.INTEGER, allowNull: false },
        property_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'properties', key: 'id' },
          onDelete: 'CASCADE',
        },
        primary_owner_contact_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'contacts', key: 'id' },
        },
        joint_owner_contact_ids: { type: Sequelize.JSON, defaultValue: [] },
        management_package: { type: Sequelize.STRING(60), defaultValue: 'full_management' },
        fixed_monthly_fee: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        revenue_share_percent: { type: Sequelize.DECIMAL(5, 2), defaultValue: 15.00 },
        commencement_date: { type: Sequelize.DATEONLY, allowNull: true },
        agreement_envelope_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'signing_envelopes', key: 'id' },
          onDelete: 'SET NULL',
        },
        selected_services: { type: Sequelize.JSON, defaultValue: [] },
        agreed_rates: { type: Sequelize.JSON, defaultValue: {} },
        status: {
          type: Sequelize.ENUM('draft', 'pending_signature', 'active', 'terminated'),
          defaultValue: 'draft',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });
    }

    // 3. short_stay_bookings
    if (!tables.includes('short_stay_bookings')) {
      await queryInterface.createTable('short_stay_bookings', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: Sequelize.INTEGER, allowNull: false },
        booking_code: { type: Sequelize.STRING(40), allowNull: false, unique: true },
        property_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'properties', key: 'id' },
          onDelete: 'CASCADE',
        },
        lead_guest_contact_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'contacts', key: 'id' },
        },
        booking_source: {
          type: Sequelize.ENUM('direct', 'website', 'phone', 'airbnb', 'booking_com', 'agoda', 'corporate'),
          defaultValue: 'direct',
        },
        external_reference: { type: Sequelize.STRING(100), allowNull: true },
        check_in_date: { type: Sequelize.DATEONLY, allowNull: false },
        check_out_date: { type: Sequelize.DATEONLY, allowNull: false },
        nights_count: { type: Sequelize.INTEGER, defaultValue: 1 },
        adults_count: { type: Sequelize.INTEGER, defaultValue: 1 },
        children_count: { type: Sequelize.INTEGER, defaultValue: 0 },
        total_accommodation_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        cleaning_fee: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        security_deposit_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        extra_services_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        discount_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        tax_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        total_booking_value: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        paid_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        security_deposit_paid: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        agreement_envelope_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'signing_envelopes', key: 'id' },
          onDelete: 'SET NULL',
        },
        folio_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'folios', key: 'id' },
          onDelete: 'SET NULL',
        },
        status: {
          type: Sequelize.ENUM(
            'enquiry', 'hold', 'pending_verification', 'pending_agreement',
            'pending_payment', 'confirmed', 'ready_checkin', 'checked_in',
            'checked_out', 'inspection_pending', 'closed', 'cancelled'
          ),
          defaultValue: 'enquiry',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });
    }

    // 4. short_stay_booking_occupants
    if (!tables.includes('short_stay_booking_occupants')) {
      await queryInterface.createTable('short_stay_booking_occupants', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        booking_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'short_stay_bookings', key: 'id' },
          onDelete: 'CASCADE',
        },
        full_name: { type: Sequelize.STRING(150), allowNull: false },
        is_adult: { type: Sequelize.BOOLEAN, defaultValue: true },
        relationship: { type: Sequelize.STRING(60), defaultValue: 'guest' },
        phone: { type: Sequelize.STRING(50), allowNull: true },
        id_passport_number: { type: Sequelize.STRING(100), allowNull: true },
        is_contractual_signer: { type: Sequelize.BOOLEAN, defaultValue: false },
        verification_status: { type: Sequelize.STRING(40), defaultValue: 'pending' },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });
    }

    // 5. short_stay_availability_blocks
    if (!tables.includes('short_stay_availability_blocks')) {
      await queryInterface.createTable('short_stay_availability_blocks', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: Sequelize.INTEGER, allowNull: false },
        property_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'properties', key: 'id' },
          onDelete: 'CASCADE',
        },
        start_date: { type: Sequelize.DATEONLY, allowNull: false },
        end_date: { type: Sequelize.DATEONLY, allowNull: false },
        block_type: {
          type: Sequelize.ENUM('booking', 'owner_hold', 'maintenance', 'cleaning', 'blocked'),
          defaultValue: 'blocked',
        },
        booking_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'short_stay_bookings', key: 'id' },
          onDelete: 'CASCADE',
        },
        notes: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });
    }

    // 6. short_stay_readiness_checks
    if (!tables.includes('short_stay_readiness_checks')) {
      await queryInterface.createTable('short_stay_readiness_checks', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: Sequelize.INTEGER, allowNull: false },
        property_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'properties', key: 'id' },
          onDelete: 'CASCADE',
        },
        booking_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'short_stay_bookings', key: 'id' },
          onDelete: 'CASCADE',
        },
        check_type: {
          type: Sequelize.ENUM('initial_setup', 'str_readiness', 'pre_arrival', 'exit_inspection'),
          defaultValue: 'str_readiness',
        },
        checklist_data: { type: Sequelize.JSON, defaultValue: [] },
        photos: { type: Sequelize.JSON, defaultValue: [] },
        completed_by_user_id: { type: Sequelize.INTEGER, allowNull: true },
        is_passed: { type: Sequelize.BOOLEAN, defaultValue: false },
        completed_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });
    }

    // 7. short_stay_housekeeping_tasks
    if (!tables.includes('short_stay_housekeeping_tasks')) {
      await queryInterface.createTable('short_stay_housekeeping_tasks', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: Sequelize.INTEGER, allowNull: false },
        property_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'properties', key: 'id' },
          onDelete: 'CASCADE',
        },
        booking_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'short_stay_bookings', key: 'id' },
          onDelete: 'CASCADE',
        },
        task_type: {
          type: Sequelize.ENUM('turnover', 'mid_stay', 'deep_clean'),
          defaultValue: 'turnover',
        },
        assigned_provider_id: { type: Sequelize.INTEGER, allowNull: true },
        scheduled_date: { type: Sequelize.DATEONLY, allowNull: false },
        status: {
          type: Sequelize.ENUM('pending', 'in_progress', 'completed'),
          defaultValue: 'pending',
        },
        checklist: { type: Sequelize.JSON, defaultValue: [] },
        cost: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        charge_to: {
          type: Sequelize.ENUM('owner', 'guest', 'agency'),
          defaultValue: 'owner',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });
    }

    // 8. short_stay_incidents
    if (!tables.includes('short_stay_incidents')) {
      await queryInterface.createTable('short_stay_incidents', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: Sequelize.INTEGER, allowNull: false },
        property_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'properties', key: 'id' },
          onDelete: 'CASCADE',
        },
        booking_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'short_stay_bookings', key: 'id' },
          onDelete: 'SET NULL',
        },
        severity: {
          type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
          defaultValue: 'medium',
        },
        category: {
          type: Sequelize.ENUM('damage', 'noise_complaint', 'missing_item', 'safety', 'breach'),
          defaultValue: 'damage',
        },
        description: { type: Sequelize.TEXT, allowNull: false },
        evidence_urls: { type: Sequelize.JSON, defaultValue: [] },
        work_order_id: { type: Sequelize.INTEGER, allowNull: true },
        estimated_cost: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        deduct_from_deposit_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
        status: {
          type: Sequelize.ENUM('reported', 'investigating', 'resolved', 'closed'),
          defaultValue: 'reported',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('short_stay_incidents');
    await queryInterface.dropTable('short_stay_housekeeping_tasks');
    await queryInterface.dropTable('short_stay_readiness_checks');
    await queryInterface.dropTable('short_stay_availability_blocks');
    await queryInterface.dropTable('short_stay_booking_occupants');
    await queryInterface.dropTable('short_stay_bookings');
    await queryInterface.dropTable('short_stay_owner_managements');
    await queryInterface.dropTable('short_stay_property_profiles');
  },
};
