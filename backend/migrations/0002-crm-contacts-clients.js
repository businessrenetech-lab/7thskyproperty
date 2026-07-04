'use strict';

/**
 * 0002 — CRM core: detailed Contacts directory, Clients, contact documents,
 * and a generic communications log (reused by contacts/clients/leads/providers).
 *
 * Design:
 *  - contacts      = master person/organisation directory (rich detail).
 *  - clients       = a contact promoted to a client, with role flags
 *                    (buyer/seller/landlord/tenant/service/NRB) + portal access.
 *  - contact_documents = KYC & files (NID, passport, trade licence, etc.).
 *  - communications    = polymorphic comms history (call/email/sms/meeting/note).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, BOOLEAN, ENUM, JSON, DATE, DATEONLY } = Sequelize;
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    const fkUser = (allowNull = true) => ({
      type: INTEGER, allowNull,
      references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
    });
    const fkBranch = (allowNull = false) => ({
      type: INTEGER, allowNull,
      references: { model: 'branches', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
    });

    // ── contacts (detailed master directory) ───────────────────────────────
    await queryInterface.createTable('contacts', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: fkBranch(false),
      contact_code: { type: STRING(40), unique: true },          // e.g. SSPC-CT-000123
      contact_type: { type: ENUM('individual', 'company'), defaultValue: 'individual' },
      salutation: { type: STRING(20) },
      first_name: { type: STRING },
      last_name: { type: STRING },
      full_name: { type: STRING, allowNull: false },             // searchable display name
      company_name: { type: STRING },
      designation: { type: STRING },
      // Contact channels
      primary_phone: { type: STRING },
      alt_phone: { type: STRING },
      whatsapp: { type: STRING },
      email: { type: STRING },
      alt_email: { type: STRING },
      website: { type: STRING },
      preferred_contact_method: { type: ENUM('phone', 'email', 'whatsapp', 'sms'), defaultValue: 'phone' },
      preferred_language: { type: STRING(40), defaultValue: 'Bangla' },
      // Address
      address_line1: { type: STRING },
      address_line2: { type: STRING },
      area: { type: STRING },
      city: { type: STRING },
      district: { type: STRING },
      postal_code: { type: STRING(20) },
      country: { type: STRING, defaultValue: 'Bangladesh' },
      // Identity / KYC
      national_id: { type: STRING(40) },
      passport_no: { type: STRING(40) },
      tin: { type: STRING(40) },
      trade_licence_no: { type: STRING(60) },
      company_reg_no: { type: STRING(60) },
      date_of_birth: { type: DATEONLY },
      gender: { type: ENUM('male', 'female', 'other') },
      nationality: { type: STRING, defaultValue: 'Bangladeshi' },
      // NRB (Non-Resident Bangladeshi) handling
      is_nrb: { type: BOOLEAN, defaultValue: false },
      nrb_country: { type: STRING },
      // CRM meta
      source: { type: STRING },                                  // Website, Referral, Facebook, Walk-in...
      source_detail: { type: STRING },
      assigned_to: fkUser(true),
      tags: { type: JSON, defaultValue: [] },
      notes: { type: TEXT },
      status: { type: ENUM('active', 'inactive', 'blacklisted'), defaultValue: 'active' },
      is_client: { type: BOOLEAN, defaultValue: false },         // promoted to client?
      created_by: fkUser(true),
      ...ts,
    });

    // ── clients (a contact acting as a client) ──────────────────────────────
    await queryInterface.createTable('clients', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: fkBranch(false),
      contact_id: {
        type: INTEGER, allowNull: false,
        references: { model: 'contacts', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      client_code: { type: STRING(40), unique: true },           // e.g. SSPC-C-000045
      // Role flags — a client can be several at once
      is_buyer: { type: BOOLEAN, defaultValue: false },
      is_seller: { type: BOOLEAN, defaultValue: false },
      is_landlord: { type: BOOLEAN, defaultValue: false },
      is_tenant: { type: BOOLEAN, defaultValue: false },
      is_service_client: { type: BOOLEAN, defaultValue: false },
      is_nrb_client: { type: BOOLEAN, defaultValue: false },
      client_segment: { type: ENUM('standard', 'priority', 'vip'), defaultValue: 'standard' },
      // Portal access
      portal_enabled: { type: BOOLEAN, defaultValue: false },
      portal_user_id: fkUser(true),                              // linked login (role buyer/tenant)
      // Relationship / lifecycle
      relationship_owner_id: fkUser(true),                       // staff who owns the relationship
      onboarded_at: { type: DATE },
      status: { type: ENUM('prospect', 'active', 'dormant', 'closed'), defaultValue: 'active' },
      notes: { type: TEXT },
      created_by: fkUser(true),
      ...ts,
    });

    // ── contact_documents (KYC + general files) ─────────────────────────────
    await queryInterface.createTable('contact_documents', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      contact_id: {
        type: INTEGER, allowNull: false,
        references: { model: 'contacts', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      doc_type: { type: STRING, allowNull: false },              // NID, Passport, TradeLicence, TIN, Photo, Other
      title: { type: STRING },
      file_url: { type: STRING, allowNull: false },
      file_name: { type: STRING },
      mime_type: { type: STRING(120) },
      expiry_date: { type: DATEONLY },                           // for compliance reminders
      uploaded_by: fkUser(true),
      ...ts,
    });

    // ── communications (polymorphic comms history) ──────────────────────────
    await queryInterface.createTable('communications', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: fkBranch(false),
      entity_type: { type: STRING(40), allowNull: false },       // contact | client | lead | provider | project
      entity_id: { type: INTEGER, allowNull: false },
      channel: { type: ENUM('call', 'email', 'sms', 'whatsapp', 'meeting', 'note'), defaultValue: 'note' },
      direction: { type: ENUM('inbound', 'outbound', 'internal'), defaultValue: 'outbound' },
      subject: { type: STRING },
      body: { type: TEXT },
      occurred_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      follow_up_at: { type: DATE },
      user_id: fkUser(true),                                     // who logged / performed it
      ...ts,
    });

    // Indexes
    await queryInterface.addIndex('contacts', ['branch_id']);
    await queryInterface.addIndex('contacts', ['full_name']);
    await queryInterface.addIndex('contacts', ['primary_phone']);
    await queryInterface.addIndex('contacts', ['email']);
    await queryInterface.addIndex('contacts', ['is_client']);
    await queryInterface.addIndex('clients', ['branch_id']);
    await queryInterface.addIndex('clients', ['contact_id']);
    await queryInterface.addIndex('contact_documents', ['contact_id', 'doc_type']);
    await queryInterface.addIndex('communications', ['entity_type', 'entity_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('communications');
    await queryInterface.dropTable('contact_documents');
    await queryInterface.dropTable('clients');
    await queryInterface.dropTable('contacts');
  },
};
