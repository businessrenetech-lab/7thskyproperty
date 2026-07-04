'use strict';

/**
 * 0001 — Core identity & infrastructure tables.
 * Matches the reusable models: Branch, User, RbacConfig, SystemSetting,
 * AuditLog, Notification. These are the foundation every other module builds on.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, BOOLEAN, ENUM, JSON, DATE } = Sequelize;
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };

    // ── branches ──────────────────────────────────────────────────────────
    await queryInterface.createTable('branches', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: STRING, allowNull: false },
      code: { type: STRING, allowNull: false, unique: true },
      slug: { type: STRING, allowNull: true, unique: true },
      type: { type: ENUM('head', 'branch'), defaultValue: 'branch' },
      address: { type: TEXT },
      phone: { type: STRING },
      email: { type: STRING },
      public_title: { type: STRING },
      public_description: { type: TEXT },
      seo_title: { type: STRING },
      seo_description: { type: STRING(500) },
      hero_image_url: { type: STRING },
      opening_hours: { type: STRING },
      map_url: { type: TEXT },
      coming_soon_message: { type: STRING(500) },
      is_active: { type: BOOLEAN, defaultValue: true },
      manager_id: { type: INTEGER, allowNull: true },
      ...ts,
    });

    // ── users ─────────────────────────────────────────────────────────────
    await queryInterface.createTable('users', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: {
        type: INTEGER, allowNull: false,
        references: { model: 'branches', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      name: { type: STRING, allowNull: false },
      email: { type: STRING, allowNull: false, unique: true },
      password: { type: STRING, allowNull: false },
      role: { type: STRING, defaultValue: 'unassigned' },
      status: { type: ENUM('active', 'inactive', 'suspended'), defaultValue: 'active' },
      tfa_enabled: { type: BOOLEAN, defaultValue: false },
      tfa_secret: { type: STRING },
      ...ts,
    });

    // branches.manager_id → users.id (added after users exists)
    await queryInterface.addConstraint('branches', {
      fields: ['manager_id'],
      type: 'foreign key',
      name: 'fk_branches_manager',
      references: { table: 'users', field: 'id' },
      onUpdate: 'CASCADE', onDelete: 'SET NULL',
    });

    // ── rbac_configs ──────────────────────────────────────────────────────
    await queryInterface.createTable('rbac_configs', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      config_json: { type: TEXT('long'), allowNull: false, defaultValue: '{}' },
      custom_roles_json: { type: TEXT('long'), allowNull: false, defaultValue: '[]' },
      updated_by: { type: INTEGER, allowNull: true },
      ...ts,
    });

    // ── system_settings ───────────────────────────────────────────────────
    await queryInterface.createTable('system_settings', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      setting_key: { type: STRING, allowNull: false, unique: true },
      setting_value: { type: TEXT, allowNull: true },
      description: { type: STRING, allowNull: true },
      is_secret: { type: BOOLEAN, defaultValue: false },
      category: { type: STRING, allowNull: true, defaultValue: 'general' },
      ...ts,
    });

    // ── audit_logs ────────────────────────────────────────────────────────
    await queryInterface.createTable('audit_logs', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      user_id: { type: INTEGER, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      branch_id: { type: INTEGER, references: { model: 'branches', key: 'id' }, onDelete: 'SET NULL' },
      action: { type: STRING, allowNull: false },
      entity: { type: STRING, allowNull: false },
      entity_id: { type: INTEGER },
      old_value: { type: JSON },
      new_value: { type: JSON },
      ip_address: { type: STRING },
      ...ts,
    });

    // ── notifications ─────────────────────────────────────────────────────
    await queryInterface.createTable('notifications', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      user_id: { type: INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      branch_id: { type: INTEGER, references: { model: 'branches', key: 'id' }, onDelete: 'SET NULL' },
      title: { type: STRING, allowNull: false },
      message: { type: TEXT, allowNull: false },
      type: { type: ENUM('info', 'alert', 'success', 'warning'), defaultValue: 'info' },
      is_read: { type: BOOLEAN, defaultValue: false },
      ...ts,
    });

    // Helpful indexes
    await queryInterface.addIndex('users', ['branch_id']);
    await queryInterface.addIndex('users', ['role']);
    await queryInterface.addIndex('notifications', ['user_id', 'is_read']);
    await queryInterface.addIndex('audit_logs', ['entity', 'entity_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('branches', 'fk_branches_manager').catch(() => {});
    await queryInterface.dropTable('notifications');
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('system_settings');
    await queryInterface.dropTable('rbac_configs');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('branches');
  },
};
