'use strict';

/**
 * 0011 — Config-driven CRM engine + shared registers.
 *
 * The workbooks describe many per-vertical "registers" (Buyer Master, Property
 * Sourcing, Negotiation Tracker, Bond & Deposit, etc.). Rather than hard-code a
 * table per register, we provide a flexible engine:
 *   - verticals            : each business line + ID prefix + visibility
 *   - workflow_templates    : ordered stages (with checklists/required docs)
 *   - register_definitions  : a register's column schema (per vertical)
 *   - register_entries      : flexible rows (JSON data) linked to a project
 * Plus first-class shared registers used across verticals: amc_contracts,
 * complaints.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, BOOLEAN, ENUM, JSON, DECIMAL, DATE, DATEONLY } = Sequelize;
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    const fkUser = (allowNull = true) => ({ type: INTEGER, allowNull, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' });
    const nf = (table) => ({ type: INTEGER, references: { model: table, key: 'id' }, onDelete: 'SET NULL' });

    // ── verticals ────────────────────────────────────────────────────────────
    await queryInterface.createTable('verticals', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      vertical_key: { type: STRING(40), allowNull: false, unique: true },
      name: { type: STRING, allowNull: false },
      description: { type: TEXT },
      id_prefix: { type: STRING(20) },   // e.g. WTCM, RESS (used to generate codes)
      dashboards: { type: JSON, defaultValue: [] },   // ['Executive','Operations','Financial',...]
      config: { type: JSON, defaultValue: {} },
      sort_order: { type: INTEGER, defaultValue: 0 },
      is_active: { type: BOOLEAN, defaultValue: true },
      is_hidden: { type: BOOLEAN, defaultValue: false },
      ...ts,
    });

    // ── workflow_templates ────────────────────────────────────────────────
    await queryInterface.createTable('workflow_templates', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      vertical_key: { type: STRING(40), allowNull: false },
      name: { type: STRING, allowNull: false },
      // stages: [{key,name,order,checklist:[{label,required}],required_docs:[],gate:bool}]
      stages: { type: JSON, defaultValue: [] },
      is_active: { type: BOOLEAN, defaultValue: true },
      ...ts,
    });

    // ── register_definitions ──────────────────────────────────────────────
    await queryInterface.createTable('register_definitions', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      vertical_key: { type: STRING(40), allowNull: false },
      register_key: { type: STRING(60), allowNull: false },   // buyer_master, property_sourcing, negotiation...
      name: { type: STRING, allowNull: false },
      // columns: [{key,label,type,options?,required?}]
      columns: { type: JSON, defaultValue: [] },
      sort_order: { type: INTEGER, defaultValue: 0 },
      is_active: { type: BOOLEAN, defaultValue: true },
      ...ts,
    });

    // ── register_entries (flexible rows) ──────────────────────────────────
    await queryInterface.createTable('register_entries', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onDelete: 'RESTRICT' },
      register_definition_id: { type: INTEGER, allowNull: false, references: { model: 'register_definitions', key: 'id' }, onDelete: 'CASCADE' },
      vertical_key: { type: STRING(40) },
      project_id: nf('projects'),
      property_id: nf('properties'),
      client_id: nf('clients'),
      entry_code: { type: STRING(40) },
      data: { type: JSON, defaultValue: {} },     // matches register_definition.columns
      status: { type: STRING(40) },
      created_by: fkUser(true),
      ...ts,
    });

    // ── amc_contracts (Annual Maintenance Contracts) ───────────────────────
    await queryInterface.createTable('amc_contracts', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onDelete: 'RESTRICT' },
      amc_code: { type: STRING(40), unique: true },
      client_id: nf('clients'),
      property_id: nf('properties'),
      service_id: nf('services'),
      vertical_key: { type: STRING(40) },
      plan: { type: STRING },          // Basic, Standard, Premium, Commercial...
      frequency: { type: ENUM('monthly', 'quarterly', 'six_monthly', 'annual'), defaultValue: 'annual' },
      start_date: { type: DATEONLY },
      end_date: { type: DATEONLY },
      next_service_date: { type: DATEONLY },
      value: { type: DECIMAL(15, 2) },
      status: { type: ENUM('active', 'due', 'expired', 'cancelled'), defaultValue: 'active' },
      last_reminded_at: { type: DATE },
      notes: { type: TEXT },
      created_by: fkUser(true),
      ...ts,
    });

    // ── complaints / incidents ──────────────────────────────────────────────
    await queryInterface.createTable('complaints', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onDelete: 'RESTRICT' },
      complaint_code: { type: STRING(40), unique: true },
      client_id: nf('clients'),
      property_id: nf('properties'),
      project_id: nf('projects'),
      work_order_id: nf('work_orders'),
      category: { type: STRING },
      severity: { type: ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
      description: { type: TEXT },
      status: { type: ENUM('open', 'investigating', 'resolved', 'closed'), defaultValue: 'open' },
      assigned_to: fkUser(true),
      resolution: { type: TEXT },
      resolved_at: { type: DATE },
      created_by: fkUser(true),
      ...ts,
    });

    await queryInterface.addIndex('workflow_templates', ['vertical_key']);
    await queryInterface.addIndex('register_definitions', ['vertical_key', 'register_key']);
    await queryInterface.addIndex('register_entries', ['register_definition_id']);
    await queryInterface.addIndex('register_entries', ['project_id']);
    await queryInterface.addIndex('amc_contracts', ['branch_id', 'status']);
    await queryInterface.addIndex('amc_contracts', ['next_service_date']);
    await queryInterface.addIndex('complaints', ['branch_id', 'status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('complaints');
    await queryInterface.dropTable('amc_contracts');
    await queryInterface.dropTable('register_entries');
    await queryInterface.dropTable('register_definitions');
    await queryInterface.dropTable('workflow_templates');
    await queryInterface.dropTable('verticals');
  },
};
