'use strict';

/**
 * 0005 — Lead management: leads pipeline + lead activities.
 * Pipeline: New → Contacted → Follow-up → Meeting → Converted → Lost.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, ENUM, DECIMAL, DATE } = Sequelize;
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    const fkUser = (allowNull = true) => ({
      type: INTEGER, allowNull,
      references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
    });

    await queryInterface.createTable('leads', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: {
        type: INTEGER, allowNull: false,
        references: { model: 'branches', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      lead_code: { type: STRING(40), unique: true },
      // Lead identity (may exist before becoming a contact)
      contact_id: { type: INTEGER, references: { model: 'contacts', key: 'id' }, onDelete: 'SET NULL' },
      name: { type: STRING, allowNull: false },
      phone: { type: STRING },
      email: { type: STRING },
      // Interest
      vertical_key: { type: STRING(40) },
      service_id: { type: INTEGER, references: { model: 'services', key: 'id' }, onDelete: 'SET NULL' },
      property_id: { type: INTEGER, references: { model: 'properties', key: 'id' }, onDelete: 'SET NULL' },
      requirement: { type: TEXT },
      // Pipeline
      source: { type: STRING },
      status: {
        type: ENUM('new', 'contacted', 'follow_up', 'meeting', 'converted', 'lost'),
        defaultValue: 'new',
      },
      priority: { type: ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
      estimated_value: { type: DECIMAL(15, 2) },
      assigned_to: fkUser(true),
      next_follow_up: { type: DATE },
      lost_reason: { type: STRING },
      converted_client_id: { type: INTEGER, references: { model: 'clients', key: 'id' }, onDelete: 'SET NULL' },
      converted_at: { type: DATE },
      notes: { type: TEXT },
      created_by: fkUser(true),
      ...ts,
    });

    await queryInterface.createTable('lead_activities', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      lead_id: {
        type: INTEGER, allowNull: false,
        references: { model: 'leads', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      activity_type: { type: ENUM('call', 'email', 'sms', 'whatsapp', 'meeting', 'note', 'status_change'), defaultValue: 'note' },
      title: { type: STRING },
      notes: { type: TEXT },
      outcome: { type: STRING },
      occurred_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      user_id: fkUser(true),
      ...ts,
    });

    await queryInterface.addIndex('leads', ['branch_id', 'status']);
    await queryInterface.addIndex('leads', ['assigned_to']);
    await queryInterface.addIndex('leads', ['next_follow_up']);
    await queryInterface.addIndex('lead_activities', ['lead_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('lead_activities');
    await queryInterface.dropTable('leads');
  },
};
