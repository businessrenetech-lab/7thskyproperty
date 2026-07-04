'use strict';

/**
 * 0006 — Service provider (third-party) management + compliance documents.
 * Providers map to the "Provider Master Register" in the workbooks, with
 * licence/insurance compliance tracking and expiry reminders.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, BOOLEAN, ENUM, JSON, DECIMAL, DATE, DATEONLY } = Sequelize;
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    const fkUser = (allowNull = true) => ({
      type: INTEGER, allowNull,
      references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
    });

    await queryInterface.createTable('service_providers', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: {
        type: INTEGER, allowNull: false,
        references: { model: 'branches', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      provider_code: { type: STRING(40), unique: true },
      // Optional link to a contact record for shared person/company details
      contact_id: { type: INTEGER, references: { model: 'contacts', key: 'id' }, onDelete: 'SET NULL' },
      company_name: { type: STRING, allowNull: false },
      contact_person: { type: STRING },
      phone: { type: STRING },
      email: { type: STRING },
      address: { type: TEXT },
      // Capability
      specialisations: { type: JSON, defaultValue: [] },   // ['cleaning','electrical','solar',...]
      service_categories: { type: JSON, defaultValue: [] },
      coverage_areas: { type: JSON, defaultValue: [] },
      availability: { type: ENUM('available', 'busy', 'unavailable'), defaultValue: 'available' },
      // Portal access (role: supplier)
      portal_enabled: { type: BOOLEAN, defaultValue: false },
      portal_user_id: fkUser(true),
      // Commercials / banking
      rate_card: { type: JSON, defaultValue: {} },
      bank_details: { type: JSON, defaultValue: {} },
      // Performance & status
      rating: { type: DECIMAL(3, 2) },
      internal_notes: { type: TEXT },
      non_circumvention_agreed: { type: BOOLEAN, defaultValue: false },
      status: {
        type: ENUM('pending_onboarding', 'approved', 'suspended', 'terminated', 'inactive'),
        defaultValue: 'pending_onboarding',
      },
      onboarded_at: { type: DATE },
      created_by: fkUser(true),
      ...ts,
    });

    await queryInterface.createTable('provider_compliance', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      provider_id: {
        type: INTEGER, allowNull: false,
        references: { model: 'service_providers', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      doc_type: { type: STRING, allowNull: false },   // Trade Licence, Insurance, NID, TIN, Certification...
      title: { type: STRING },
      reference_no: { type: STRING },
      file_url: { type: STRING },
      issued_date: { type: DATEONLY },
      expiry_date: { type: DATEONLY },
      status: { type: ENUM('valid', 'expiring', 'expired', 'missing'), defaultValue: 'valid' },
      last_reminded_at: { type: DATE },
      uploaded_by: fkUser(true),
      ...ts,
    });

    await queryInterface.addIndex('service_providers', ['branch_id', 'status']);
    await queryInterface.addIndex('provider_compliance', ['provider_id', 'expiry_date']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('provider_compliance');
    await queryInterface.dropTable('service_providers');
  },
};
