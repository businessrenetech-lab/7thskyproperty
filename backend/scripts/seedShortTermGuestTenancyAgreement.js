/**
 * Seed script for Short-Term Rental Tenancy Management Service Agreement
 * (Idempotent seed by template name)
 * Run from backend directory: node scripts/seedShortTermGuestTenancyAgreement.js
 */
require('dotenv').config();
const sequelize = require('../config/db.config');
const AgreementTemplate = require('../models/AgreementTemplate');

const NAME = 'Short-Term Rental Tenancy Management Service Agreement';

const F = (key, label, type, group, extra = {}) => ({ key, label, type, group, required: extra.required !== false, ...extra });
const CG = (key, label, group, options, required = false) => F(key, label, 'checkbox_group', group, { options, required });

const FIELDS = [
  // Agreement Date & Agency
  F('agreement_date', 'Agreement Date', 'date', 'Parties', { required: false }),
  F('ss_rep_name', 'Seventh Sky Representative Name', 'text', 'Parties'),

  // Lead Guest / Tenant Details
  F('guest_full_name', 'Lead Guest Full Name', 'text', 'Guest Details'),
  F('guest_nid', 'National ID / Passport No.', 'text', 'Guest Details'),
  F('guest_phone', 'Phone Number', 'tel', 'Guest Details'),
  F('guest_email', 'Email Address', 'email', 'Guest Details'),
  F('guest_address', 'Permanent Address', 'text', 'Guest Details'),
  F('guest_emergency_contact', 'Emergency Contact (Name & Phone)', 'text', 'Guest Details'),
  F('approved_occupants', 'Approved Occupants (Names)', 'text', 'Guest Details', { required: false }),

  // Stay & Booking Details
  F('booking_code', 'Booking Reference Code', 'text', 'Booking Details'),
  F('property_address', 'Property Address', 'text', 'Booking Details'),
  F('check_in_date', 'Check-In Date', 'date', 'Booking Details'),
  F('check_out_date', 'Check-Out Date', 'date', 'Booking Details'),
  F('nights_count', 'Number of Nights', 'number', 'Booking Details'),
  F('adults_count', 'Adult Guests', 'number', 'Booking Details'),
  F('children_count', 'Child Guests', 'number', 'Booking Details', { required: false }),

  // Financial Terms
  F('accommodation_amount', 'Accommodation Charge', 'currency', 'Charges & Security Deposit'),
  F('cleaning_fee', 'Cleaning Fee', 'currency', 'Charges & Security Deposit', { required: false }),
  F('security_deposit_amount', 'Refundable Security Deposit', 'currency', 'Charges & Security Deposit'),
  F('total_booking_value', 'Total Amount Due', 'currency', 'Charges & Security Deposit'),

  // Selected Guest Services
  CG('guest_services', 'Included Guest Services', 'Services & Rules', [
    'Furnished Short-Stay Accommodation',
    'High-Speed Wi-Fi & Utilities',
    'Assisted Check-In & Access Handover',
    'Scheduled Turnover Housekeeping',
    'Emergency Support & Maintenance Line'
  ]),

  // Execution Witnesses
  F('witness1_name', 'Witness 1 Name', 'text', 'Execution', { required: false }),
];

const SIGNERS = [
  { key: 'guest_primary', label: 'Lead Guest (Tenant)', role: 'tenant' },
  { key: 'guest_contractual_2', label: 'Joint Guest / Occupant (if applicable)', role: 'tenant', optional: true },
  { key: 'agency_representative', label: 'Seventh Sky Representative', role: 'staff_countersign' },
];

const CONTENT_HTML = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">
  <h2 style="text-align: center; color: #0f172a;">SHORT-TERM RENTAL TENANCY MANAGEMENT SERVICE AGREEMENT</h2>
  <p style="text-align: center; font-weight: bold; color: #475569;">Seventh Sky Property Care — Guest Short-Stay Tenancy Terms</p>
  <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 20px 0;" />

  <p><strong>THIS SHORT-STAY TENANCY AGREEMENT</strong> is entered into on <strong>{{agreement_date}}</strong> between:</p>

  <p><strong>1. MANAGING AGENT:</strong> Seventh Sky Properties, represented by <strong>{{ss_rep_name}}</strong>.</p>
  <p><strong>2. LEAD GUEST / TENANT:</strong> <strong>{{guest_full_name}}</strong> (ID/Passport: {{guest_nid}}), Contact: {{guest_phone}} | {{guest_email}}, Address: {{guest_address}}.</p>
  {{#if approved_occupants}}<p><strong>APPROVED OCCUPANTS:</strong> {{approved_occupants}}</p>{{/if}}

  <h3>1. BOOKING & OCCUPANCY DETAILS</h3>
  <p><strong>Booking Ref:</strong> {{booking_code}} | <strong>Property Address:</strong> {{property_address}}</p>
  <p><strong>Check-In:</strong> {{check_in_date}} (Standard 14:00) | <strong>Check-Out:</strong> {{check_out_date}} (Standard 11:00) | <strong>Duration:</strong> {{nights_count}} Night(s).</p>
  <p><strong>Approved Guest Count:</strong> {{adults_count}} Adult(s), {{children_count}} Child(ren).</p>

  <h3>2. FINANCIAL CHARGES & SECURITY DEPOSIT</h3>
  <p>Accommodation Charge: {{accommodation_amount}} | Cleaning Fee: {{cleaning_fee}} | Total Value: <strong>{{total_booking_value}}</strong>.</p>
  <p><strong>Security Deposit Held:</strong> <strong>{{security_deposit_amount}}</strong>. The deposit is fully refundable post check-out following an exit inspection, less any approved deductions for damage, missing items, or rule breaches.</p>

  <h3>3. HOUSE RULES & GUEST OBLIGATIONS</h3>
  <ul>
    <li>Strictly no smoking, parties, or illegal activities inside the premises.</li>
    <li>Occupancy is limited to approved registered guests only. Unregistered visitors require advance agent approval.</li>
    <li>Guests must maintain quiet hours between 22:00 and 08:00.</li>
    <li>Guests are liable for any property damage or missing inventory during their stay.</li>
  </ul>

  <h3>4. EXECUTION & SIGNATURES</h3>
  <p>IN WITNESS WHEREOF, the Guest and Managing Agent have executed this Short-Stay Tenancy Agreement.</p>
</div>
`;

async function seed() {
  try {
    await sequelize.authenticate();
    const [tmpl, created] = await AgreementTemplate.findOrCreate({
      where: { name: NAME },
      defaults: {
        name: NAME,
        category: 'property_management',
        vertical: 'short_stay',
        description: 'Verbatim Short-Term Rental Tenancy Management Service Agreement between Lead Guest and Seventh Sky Properties.',
        fields: FIELDS,
        signers: SIGNERS,
        content_html: CONTENT_HTML,
        status: 'active',
      },
    });

    if (!created) {
      await tmpl.update({
        fields: FIELDS,
        signers: SIGNERS,
        content_html: CONTENT_HTML,
        vertical: 'short_stay',
        status: 'active',
      });
      console.log(`[SEED] Updated agreement template "${NAME}" (ID: ${tmpl.id})`);
    } else {
      console.log(`[SEED] Created agreement template "${NAME}" (ID: ${tmpl.id})`);
    }
    process.exit(0);
  } catch (err) {
    console.error('[SEED] Error seeding guest agreement:', err);
    process.exit(1);
  }
}

seed();
