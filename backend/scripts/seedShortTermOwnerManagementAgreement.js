/**
 * Seed script for Short Term Rental Management Service Agreement
 * (Idempotent seed by template name)
 * Run from backend directory: node scripts/seedShortTermOwnerManagementAgreement.js
 */
require('dotenv').config();
const sequelize = require('../config/db.config');
const AgreementTemplate = require('../models/AgreementTemplate');

const NAME = 'Short Term Rental Management Service Agreement';

const F = (key, label, type, group, extra = {}) => ({ key, label, type, group, required: extra.required !== false, ...extra });
const CG = (key, label, group, options, required = false) => F(key, label, 'checkbox_group', group, { options, required });

const FIELDS = [
  // Parties — Agency
  F('agreement_date', 'Agreement Date', 'date', 'Parties', { required: false }),
  F('agency_name', 'Agency Name', 'text', 'Parties', { defaultValue: 'Seventh Sky Properties' }),
  F('agency_rep_name', 'Agency Representative Name', 'text', 'Parties'),
  F('agency_rep_position', 'Agency Representative Position', 'text', 'Parties', { required: false }),

  // Owner Details (STS-Owner)
  F('owner_full_name', 'Primary Owner Name', 'text', 'STS-Owner'),
  F('owner_nid', 'National ID / Passport No.', 'text', 'STS-Owner'),
  F('owner_address', 'Owner Address', 'text', 'STS-Owner'),
  F('owner_phone', 'Phone Number', 'tel', 'STS-Owner'),
  F('owner_email', 'Email Address', 'email', 'STS-Owner'),
  F('joint_owner_names', 'Joint Owner Names (if joint)', 'text', 'STS-Owner', { required: false }),

  // Property Details
  F('property_address', 'Property Address', 'text', 'Property'),
  CG('accommodation_type', 'Accommodation Type', 'Property', [
    'Serviced Apartment', 'Furnished Apartment', 'Holiday Home', 'Guest House',
    'Executive Accommodation', 'Corporate Accommodation', 'Vacation Rental', 'Other'
  ]),
  F('max_guests_capacity', 'Maximum Guest Capacity', 'number', 'Property'),
  F('commencement_date', 'Management Commencement Date', 'date', 'Property'),

  // Management Package & Services
  F('management_package', 'Selected Package', 'select', 'Management Services', {
    options: ['Full Management Package', 'Booking & Guest Management Only', 'Custom Package']
  }),
  CG('selected_services', 'Included Services', 'Management Services', [
    'Property Setup & Readiness Assessment',
    'Professional Photography & Listing Creation',
    'Multi-Channel Listing & Dynamic Pricing',
    'Guest Verification & Booking Management',
    'Check-in & Check-out Coordination',
    'Turnover Housekeeping & Linen Service',
    'Routine Maintenance & Emergency Response',
    'Monthly Owner Revenue Statements & Payouts'
  ]),

  // Fees & Revenue Share
  F('fixed_monthly_fee', 'Fixed Monthly Management Fee', 'currency', 'Fees & Revenue Share', { required: false }),
  F('revenue_share_percent', 'Revenue Share Percentage (%)', 'text', 'Fees & Revenue Share', { required: false }),
  F('cleaning_fee_setting', 'Cleaning Fee Charged to Guest', 'currency', 'Fees & Revenue Share', { required: false }),
  F('security_deposit_setting', 'Security Deposit Requirement', 'currency', 'Fees & Revenue Share', { required: false }),

  // Execution Witnesses
  F('witness1_name', 'Witness 1 Name', 'text', 'Execution', { required: false }),
  F('witness2_name', 'Witness 2 Name', 'text', 'Execution', { required: false }),
];

const SIGNERS = [
  { key: 'owner_primary', label: 'Primary Owner (STS-Owner)', role: 'landlord' },
  { key: 'owner_joint_1', label: 'Joint Owner (if applicable)', role: 'landlord', optional: true },
  { key: 'agency_representative', label: 'Seventh Sky Representative', role: 'staff_countersign' },
];

const CONTENT_HTML = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">
  <h2 style="text-align: center; color: #0f172a;">SHORT TERM RENTAL MANAGEMENT SERVICE AGREEMENT</h2>
  <p style="text-align: center; font-weight: bold; color: #475569;">Seventh Sky Property Care — Serviced & Vacation Accommodation</p>
  <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 20px 0;" />

  <p><strong>THIS AGREEMENT</strong> is made on <strong>{{agreement_date}}</strong> by and between:</p>

  <p><strong>1. THE AGENCY:</strong> {{agency_name}}, represented by <strong>{{agency_rep_name}}</strong> ({{agency_rep_position}}).</p>
  <p><strong>2. THE OWNER (STS-OWNER):</strong> <strong>{{owner_full_name}}</strong> (NID/Passport: {{owner_nid}}), residing at {{owner_address}}, Contact: {{owner_phone}} | {{owner_email}}.</p>
  {{#if joint_owner_names}}<p><strong>JOINT OWNERS:</strong> {{joint_owner_names}}</p>{{/if}}

  <h3>1. PREMISES & ACCOMMODATION TYPE</h3>
  <p>The Owner grants Seventh Sky Properties exclusive management rights for short-term stay operation of the property located at:</p>
  <p><strong>Property Address:</strong> {{property_address}}</p>
  <p><strong>Accommodation Category:</strong> {{accommodation_type}} | <strong>Max Guest Capacity:</strong> {{max_guests_capacity}} Guests.</p>
  <p><strong>Commencement Date:</strong> {{commencement_date}}.</p>

  <h3>2. SCOPE OF SERVICES & MANAGEMENT PACKAGE</h3>
  <p>Package Selected: <strong>{{management_package}}</strong></p>
  <p>Services Agreed:</p>
  <ul>
    <li>{{selected_services}}</li>
  </ul>

  <h3>3. FINANCIAL TERMS, REVENUE SHARE & DISBURSEMENTS</h3>
  <p>Management Fee / Revenue Share: <strong>{{revenue_share_percent}}%</strong> of gross booking revenue (or Fixed Monthly Fee of {{fixed_monthly_fee}}).</p>
  <p>Cleaning Fee: {{cleaning_fee_setting}} | Security Deposit Held: {{security_deposit_setting}}.</p>
  <p>Disbursements: Owner payouts are remitted monthly alongside a detailed Short Term Stay Owner Income & Expense Statement.</p>

  <h3>4. OBLIGATIONS & GUEST READINESS</h3>
  <p>The Owner warrants that the property is fully furnished, insured, and compliant with safety guidelines. Seventh Sky Properties will conduct an STR Readiness Inspection prior to public listing activation.</p>

  <h3>5. EXECUTION & SIGNATURES</h3>
  <p>IN WITNESS WHEREOF, the parties hereto have executed this Agreement on the date first written above.</p>
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
        description: 'Verbatim Short Term Rental Management Service Agreement between STS-Owner and Seventh Sky Properties.',
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
    console.error('[SEED] Error seeding owner agreement:', err);
    process.exit(1);
  }
}

seed();
