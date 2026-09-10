/*
 * seedActiveTenantLogin.js (D4b) — provision a durable ACTIVE-tenant portal login
 * for testing the tenant self-service flow (pay rent / raise work order / give
 * vacancy notice). The seeded tenant1 login's contact has only a CLOSED tenancy,
 * so it can't exercise those paths. This links a real tenant User -> Client
 * (portal_user_id) -> the tenant contact of an ACTIVE tenancy, exactly the way
 * controllers/client.controller.enablePortal does (resolveTenantContactId reads
 * Client.portal_user_id -> contact_id -> active tenancy).
 *
 * Idempotent: re-running resets the password and re-links. Prints the credentials.
 */
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db.config');
const Tenancy = require('../models/Tenancy');
const Contact = require('../models/Contact');
const Client = require('../models/Client');
const User = require('../models/User');
const { generateCode } = require('../utils/codeGenerator');

const EMAIL = process.env.SEED_TENANT_EMAIL || 'activetenant@example.com';
const PASSWORD = process.env.SEED_TENANT_PASSWORD || 'Tenant#2026';

async function run() {
  // Pick an active tenancy with a tenant contact and a fully-active lease.
  const t = await Tenancy.findOne({
    where: { status: 'active', lease_status: 'active' },
    order: [['id', 'DESC']],
  }) || await Tenancy.findOne({ where: { status: 'active' }, order: [['id', 'DESC']] });
  if (!t || !t.tenant_contact_id) { console.error('No active tenancy with a tenant contact found.'); process.exit(2); }

  const contact = await Contact.findByPk(t.tenant_contact_id);
  if (!contact) { console.error(`Tenant contact ${t.tenant_contact_id} not found.`); process.exit(2); }

  const hash = await bcrypt.hash(PASSWORD, 12);
  // User (role tenant) — create or reset password.
  let user = await User.findOne({ where: { email: EMAIL } });
  if (user) {
    await user.update({ password: hash, role: 'tenant', status: 'active', branch_id: t.branch_id });
  } else {
    user = await User.create({
      branch_id: t.branch_id, name: contact.full_name || 'Active Tenant',
      email: EMAIL, password: hash, role: 'tenant', status: 'active',
    });
  }

  // Client row for the tenant contact — create or update the portal link.
  let client = await Client.findOne({ where: { contact_id: contact.id } });
  if (!client) {
    client = await Client.create({
      branch_id: t.branch_id, contact_id: contact.id,
      client_code: await generateCode(Client, 'client_code', 'SSPC-CL-'),
      is_tenant: true, status: 'active', portal_enabled: true, portal_user_id: user.id,
    });
  } else {
    await client.update({ is_tenant: true, portal_enabled: true, portal_user_id: user.id });
  }

  console.log('✓ Active-tenant portal login ready');
  console.log(`  email:    ${EMAIL}`);
  console.log(`  password: ${PASSWORD}`);
  console.log(`  tenant:   ${contact.full_name} (contact ${contact.id})`);
  console.log(`  tenancy:  ${t.tenancy_code} (property ${t.property_id}, lease ${t.lease_status})`);
  console.log(`  user id:  ${user.id} · client ${client.client_code}`);
}

run().then(() => sequelize.close()).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
