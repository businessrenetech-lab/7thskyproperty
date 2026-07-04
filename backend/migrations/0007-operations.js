'use strict';

/**
 * 0007 — Operations core: projects + stage-gate, tasks, work orders,
 * inspections + inspection items. These implement the workbook workflow:
 * Lead → Assessment → Quote → Agreement → Delivery → Completion → Feedback.
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
    const fkBranch = { type: INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' };
    const nf = (table) => ({ type: INTEGER, references: { model: table, key: 'id' }, onDelete: 'SET NULL' });

    // ── projects ──────────────────────────────────────────────────────────
    await queryInterface.createTable('projects', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: fkBranch,
      project_code: { type: STRING(40), unique: true },
      title: { type: STRING, allowNull: false },
      vertical_key: { type: STRING(40) },
      client_id: nf('clients'),
      contact_id: nf('contacts'),
      property_id: nf('properties'),
      service_id: nf('services'),
      status: {
        type: ENUM('lead', 'assessment', 'quote', 'agreement', 'delivery', 'completion', 'feedback', 'closed', 'cancelled', 'on_hold'),
        defaultValue: 'lead',
      },
      current_stage_key: { type: STRING(60) },
      priority: { type: ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
      assigned_to: fkUser(true),
      value: { type: DECIMAL(15, 2) },
      start_date: { type: DATEONLY },
      due_date: { type: DATEONLY },
      completed_at: { type: DATE },
      notes: { type: TEXT },
      created_by: fkUser(true),
      ...ts,
    });

    // ── project_stages (stage-gate per project) ─────────────────────────────
    await queryInterface.createTable('project_stages', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      project_id: { type: INTEGER, allowNull: false, references: { model: 'projects', key: 'id' }, onDelete: 'CASCADE' },
      stage_key: { type: STRING(60), allowNull: false },
      stage_name: { type: STRING, allowNull: false },
      sort_order: { type: INTEGER, defaultValue: 0 },
      status: { type: ENUM('pending', 'in_progress', 'done', 'skipped', 'blocked'), defaultValue: 'pending' },
      assigned_to: fkUser(true),
      due_date: { type: DATEONLY },
      completed_at: { type: DATE },
      checklist: { type: JSON, defaultValue: [] },   // [{label, done, required}]
      required_documents: { type: JSON, defaultValue: [] },
      notes: { type: TEXT },
      ...ts,
    });

    // ── tasks (polymorphic) ──────────────────────────────────────────────────
    await queryInterface.createTable('tasks', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: fkBranch,
      title: { type: STRING, allowNull: false },
      description: { type: TEXT },
      related_type: { type: STRING(40) },   // project | property | client | work_order | lead | inspection
      related_id: { type: INTEGER },
      assigned_to: fkUser(true),
      priority: { type: ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
      status: { type: ENUM('open', 'in_progress', 'done', 'cancelled'), defaultValue: 'open' },
      due_date: { type: DATE },
      completed_at: { type: DATE },
      created_by: fkUser(true),
      ...ts,
    });

    // ── work_orders ───────────────────────────────────────────────────────
    await queryInterface.createTable('work_orders', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: fkBranch,
      work_order_code: { type: STRING(40), unique: true },
      project_id: nf('projects'),
      provider_id: nf('service_providers'),
      service_id: nf('services'),
      property_id: nf('properties'),
      client_id: nf('clients'),
      title: { type: STRING, allowNull: false },
      scope: { type: TEXT },
      status: { type: ENUM('draft', 'issued', 'accepted', 'in_progress', 'completed', 'cancelled'), defaultValue: 'draft' },
      scheduled_date: { type: DATEONLY },
      completed_date: { type: DATEONLY },
      amount: { type: DECIMAL(15, 2) },
      before_photos: { type: JSON, defaultValue: [] },
      after_photos: { type: JSON, defaultValue: [] },
      provider_notes: { type: TEXT },
      notes: { type: TEXT },
      created_by: fkUser(true),
      ...ts,
    });

    // ── inspections ───────────────────────────────────────────────────────
    await queryInterface.createTable('inspections', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: fkBranch,
      inspection_code: { type: STRING(40), unique: true },
      property_id: nf('properties'),
      project_id: nf('projects'),
      client_id: nf('clients'),
      inspection_type: { type: ENUM('site_assessment', 'entry', 'routine', 'exit', 'other'), defaultValue: 'routine' },
      status: { type: ENUM('scheduled', 'in_progress', 'completed', 'cancelled'), defaultValue: 'scheduled' },
      scheduled_date: { type: DATE },
      completed_date: { type: DATE },
      inspector_id: fkUser(true),
      summary: { type: TEXT },
      report_url: { type: STRING },
      created_by: fkUser(true),
      ...ts,
    });

    // ── inspection_items ──────────────────────────────────────────────────
    await queryInterface.createTable('inspection_items', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      inspection_id: { type: INTEGER, allowNull: false, references: { model: 'inspections', key: 'id' }, onDelete: 'CASCADE' },
      area: { type: STRING },
      item: { type: STRING },
      condition: { type: ENUM('good', 'fair', 'poor', 'damaged', 'na'), defaultValue: 'good' },
      notes: { type: TEXT },
      photo_url: { type: STRING },
      sort_order: { type: INTEGER, defaultValue: 0 },
      ...ts,
    });

    await queryInterface.addIndex('projects', ['branch_id', 'status']);
    await queryInterface.addIndex('projects', ['client_id']);
    await queryInterface.addIndex('project_stages', ['project_id']);
    await queryInterface.addIndex('tasks', ['related_type', 'related_id']);
    await queryInterface.addIndex('tasks', ['assigned_to', 'status']);
    await queryInterface.addIndex('work_orders', ['provider_id', 'status']);
    await queryInterface.addIndex('work_orders', ['project_id']);
    await queryInterface.addIndex('inspections', ['property_id']);
    await queryInterface.addIndex('inspection_items', ['inspection_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('inspection_items');
    await queryInterface.dropTable('inspections');
    await queryInterface.dropTable('work_orders');
    await queryInterface.dropTable('tasks');
    await queryInterface.dropTable('project_stages');
    await queryInterface.dropTable('projects');
  },
};
