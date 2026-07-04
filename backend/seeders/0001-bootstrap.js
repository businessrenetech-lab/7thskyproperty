'use strict';

const bcrypt = require('bcryptjs');

/**
 * Bootstrap the Seventh Sky system:
 *  - Head branch
 *  - Super admin user
 *  - RBAC permission matrix (roles + module access)
 *  - Business verticals (visible + hidden-at-launch)
 *
 * Idempotent: checks for existing rows before inserting.
 */
const ROLES = ['super_admin', 'branch_admin', 'property_manager', 'sales_executive', 'accounts', 'owner', 'tenant', 'buyer', 'supplier'];
const MODULES = [
  'dashboard', 'contacts', 'clients', 'properties', 'services', 'leads', 'providers',
  'projects', 'work_orders', 'inspections', 'tasks', 'documents', 'signing', 'compliance',
  'quotations', 'invoices', 'payments', 'finance', 'reports', 'website', 'users', 'rbac', 'settings',
];

const FULL = { view: true, create: true, edit: true, delete: true };
const READ = { view: true, create: false, edit: false, delete: false };
const EDIT = { view: true, create: true, edit: true, delete: false };
const NONE = { view: false, create: false, edit: false, delete: false };

function buildMatrix() {
  const m = {};
  for (const role of ROLES) { m[role] = {}; for (const mod of MODULES) m[role][mod] = NONE; }
  // super_admin: everything
  for (const mod of MODULES) m.super_admin[mod] = FULL;
  // branch_admin: operational management (no rbac, limited users/settings)
  for (const mod of MODULES) m.branch_admin[mod] = EDIT;
  m.branch_admin.rbac = NONE; m.branch_admin.users = EDIT; m.branch_admin.settings = READ;
  // property_manager: properties/projects/inspections/tasks/work orders
  ['dashboard', 'properties', 'projects', 'work_orders', 'inspections', 'tasks', 'documents', 'contacts', 'clients', 'providers', 'compliance'].forEach((k) => { m.property_manager[k] = EDIT; });
  m.property_manager.dashboard = READ;
  // sales_executive: leads, contacts, clients, communications
  ['dashboard', 'leads', 'contacts', 'clients', 'properties', 'quotations'].forEach((k) => { m.sales_executive[k] = EDIT; });
  m.sales_executive.dashboard = READ; m.sales_executive.properties = READ;
  // accounts: finance only
  ['dashboard', 'invoices', 'payments', 'finance', 'quotations', 'reports'].forEach((k) => { m.accounts[k] = EDIT; });
  m.accounts.reports = READ; m.accounts.dashboard = READ;
  // portal roles (owner/tenant/buyer/supplier) handled in portal apps; minimal admin matrix
  return m;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const seq = queryInterface.sequelize;

    // ── Head branch ──
    const [branches] = await seq.query("SELECT id FROM branches WHERE code = 'HEAD' LIMIT 1");
    let branchId = branches[0]?.id;
    if (!branchId) {
      await queryInterface.bulkInsert('branches', [{
        name: 'Seventh Sky Property Care — Head Office', code: 'HEAD', slug: 'head-office',
        type: 'head', is_active: true, created_at: now, updated_at: now,
      }]);
      const [b2] = await seq.query("SELECT id FROM branches WHERE code = 'HEAD' LIMIT 1");
      branchId = b2[0].id;
    }

    // ── Super admin user ──
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@seventhskyproperty.com';
    const [users] = await seq.query('SELECT id FROM users WHERE email = :email LIMIT 1', { replacements: { email: adminEmail } });
    if (!users[0]) {
      const rawPw = process.env.SEED_ADMIN_PASSWORD || 'Admin#2026';
      const hash = await bcrypt.hash(rawPw, 12);
      await queryInterface.bulkInsert('users', [{
        branch_id: branchId, name: 'Super Admin', email: adminEmail, password: hash,
        role: 'super_admin', status: 'active', created_at: now, updated_at: now,
      }]);
      // eslint-disable-next-line no-console
      console.log(`  ► Super admin created: ${adminEmail} / ${rawPw}  (change after first login)`);
    }

    // ── RBAC matrix ──
    const [rbac] = await seq.query('SELECT id FROM rbac_configs LIMIT 1');
    if (!rbac[0]) {
      const customRoles = [
        { key: 'property_manager', label: 'Property Manager' },
        { key: 'sales_executive', label: 'Sales / CRM Executive' },
        { key: 'accounts', label: 'Accounts Team' },
        { key: 'owner', label: 'Property Owner / Landlord' },
        { key: 'tenant', label: 'Tenant' },
        { key: 'buyer', label: 'Buyer / Client' },
        { key: 'supplier', label: 'Service Provider / Contractor' },
      ];
      await queryInterface.bulkInsert('rbac_configs', [{
        config_json: JSON.stringify(buildMatrix()),
        custom_roles_json: JSON.stringify(customRoles),
        created_at: now, updated_at: now,
      }]);
    }

    // ── Verticals ──
    const [vCount] = await seq.query('SELECT COUNT(*) AS c FROM verticals');
    if (Number(vCount[0].c) === 0) {
      const verticals = [
        ['properties', 'Properties', 'PROP', false, 0],
        ['property_care', 'Property Care & Concierge', 'PCARE', false, 1],
        ['leasing', 'Leasing & Tenancy Management', 'LEASE', false, 2],
        ['removal', 'Removal & Relocation Services', 'MOVE', false, 3],
        ['documentation', 'Property Documentation Support', 'DOCS', false, 4],
        ['nrb', 'NRB Dedicated Services', 'NRB', false, 5],
        ['interior', 'Interior Design', 'INTR', false, 6],
        ['solar', 'Solar & Energy Solutions', 'SOLAR', true, 7],
        ['ac', 'Air Conditioning Solutions', 'AC', true, 8],
        ['water_tank', 'Water Tank Cleaning & Maintenance', 'WTCM', true, 9],
      ];
      await queryInterface.bulkInsert('verticals', verticals.map(([key, name, prefix, hidden, order]) => ({
        vertical_key: key, name, id_prefix: prefix,
        dashboards: JSON.stringify(['Executive', 'Operations', 'Financial', 'Compliance']),
        config: JSON.stringify({}),
        sort_order: order, is_active: true, is_hidden: hidden, created_at: now, updated_at: now,
      })));
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('verticals', null, {});
    await queryInterface.bulkDelete('rbac_configs', null, {});
    await queryInterface.bulkDelete('users', { email: process.env.SEED_ADMIN_EMAIL || 'admin@seventhskyproperty.com' }, {});
    await queryInterface.bulkDelete('branches', { code: 'HEAD' }, {});
  },
};
