const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const Contact = require('./Contact');

const Tenancy = sequelize.define('Tenancy', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  tenancy_code: { type: DataTypes.STRING(40), unique: true },
  property_id: DataTypes.INTEGER,
  owner_contact_id: DataTypes.INTEGER,
  tenant_contact_id: DataTypes.INTEGER,
  lease_start: DataTypes.DATEONLY,
  move_in_date: DataTypes.DATEONLY,
  lease_end: DataTypes.DATEONLY,
  move_out_date: DataTypes.DATEONLY,
  security_deposit: DataTypes.DECIMAL(15, 2),
  monthly_rent: DataTypes.DECIMAL(15, 2),
  service_charge: DataTypes.DECIMAL(15, 2),
  rent_due_day: { type: DataTypes.INTEGER, defaultValue: 1 },
  payment_frequency: { type: DataTypes.ENUM('monthly', 'quarterly', 'half_yearly', 'yearly'), defaultValue: 'monthly' },
  status: { type: DataTypes.ENUM('upcoming', 'active', 'ended', 'terminated'), defaultValue: 'active' },
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
  // ── Lease Register (workbook) ──
  lease_status: { type: DataTypes.ENUM('draft', 'sent_for_signature', 'signed', 'active', 'expired', 'terminated'), defaultValue: 'draft' },
  advance_rent: DataTypes.DECIMAL(15, 2),
  // Business lease structure (0151) — SOP Rental §9 / Tenancy §9. Departures are
  // recorded, not blocked: the SOP allows them with management approval.
  lease_term_months: DataTypes.INTEGER,
  extension_option: DataTypes.STRING(20),
  renewal_increment_pct: DataTypes.DECIMAL(5, 2),
  advance_months: DataTypes.INTEGER,
  advance_received: DataTypes.DECIMAL(15, 2),
  structure_warnings: { type: DataTypes.JSON, defaultValue: [] },
  structure_override_by: DataTypes.INTEGER,
  structure_override_reason: DataTypes.TEXT,
  minimum_lease_period_months: { type: DataTypes.INTEGER, defaultValue: 6 },
  payment_method: DataTypes.STRING,
  agreement_sent_date: DataTypes.DATEONLY,
  signed_date: DataTypes.DATEONLY,
  renewal_reminder_date: DataTypes.DATEONLY,
  application_id: DataTypes.INTEGER,
  // Renewal lifecycle (0021)
  renewal_status: { type: DataTypes.ENUM('none', 'proposed', 'owner_approved', 'tenant_accepted', 'activated', 'declined'), defaultValue: 'none' },
  renewal_offer_rent: DataTypes.DECIMAL(15, 2),
  renewal_offer_service: DataTypes.DECIMAL(15, 2),
  renewal_offer_lease_end: DataTypes.DATEONLY,
  renewal_effective_date: DataTypes.DATEONLY,
  renewal_proposed_at: DataTypes.DATE,
  renewal_owner_approved_at: DataTypes.DATE,
  renewal_tenant_accepted_at: DataTypes.DATE,
  renewal_activated_at: DataTypes.DATE,
  renewal_notes: DataTypes.TEXT,
  // End / termination metadata (0043)
  end_type: DataTypes.ENUM('expiry', 'termination'),
  termination_reason: DataTypes.STRING,
  termination_effective_date: DataTypes.DATEONLY,
  planned_move_out_date: DataTypes.DATEONLY,
}, { tableName: 'tenancies', underscored: true });

Tenancy.belongsTo(Property, { foreignKey: 'property_id' });
Tenancy.belongsTo(Contact, { as: 'owner', foreignKey: 'owner_contact_id' });
Tenancy.belongsTo(Contact, { as: 'tenant', foreignKey: 'tenant_contact_id' });

module.exports = Tenancy;
