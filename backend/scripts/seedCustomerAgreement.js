/**
 * Seeds (or refreshes) the Water Tank Customer Service Agreement template for the
 * PropertyMe-style Agreement Builder. Uses `checkbox_group` fields (staff tick
 * which apply; ALL options render on the agreement, selected ones ticked ☑) with
 * EDITABLE options, and editable `textarea` terms prefilled with standard text.
 * Customer agreements need NO KYC. Idempotent by name. Run from backend dir:
 *   node scripts/seedCustomerAgreement.js
 */
require('dotenv').config();
const sequelize = require('../config/db.config');
const AgreementTemplate = require('../models/AgreementTemplate');

const NAME = 'Water Tank — Customer Service Agreement';

const F = (key, label, type, group, extra = {}) => ({ key, label, type, group, required: extra.required !== false, ...extra });
const CG = (key, label, group, options, required = false) => F(key, label, 'checkbox_group', group, { options, required });

const FIELDS = [
  // Client
  F('customer_name', 'Client Name', 'text', 'Client'),
  F('customer_address', 'Client Address', 'text', 'Client'),
  F('customer_phone', 'Client Phone', 'tel', 'Client'),
  F('customer_email', 'Client Email', 'email', 'Client', { required: false }),
  F('agreement_date', 'Agreement Date', 'date', 'Client', { required: false }),

  // 1. Purpose — role selection (all show, selected ticked)
  CG('purpose_roles', 'Seventh Sky primarily acts as', 'Purpose',
    ['Project Coordinator', 'Service Coordinator', 'Client Representative', 'Administration Manager', 'Contractor Liaison', 'Project Monitoring Provider'], true),

  // 2. Service Categories (A–F)
  CG('svc_cleaning', 'Water Tank Cleaning', 'Service Categories', ['Rooftop Water Tank Cleaning', 'Underground Water Tank Cleaning', 'Apartment Water Tank Cleaning', 'House Water Tank Cleaning']),
  CG('svc_disinfection', 'Water Tank Disinfection', 'Service Categories', ['Water Tank Sanitisation', 'Bacteria Treatment', 'Algae Treatment', 'Water Quality Improvement']),
  CG('svc_inspection', 'Water Tank Inspection', 'Service Categories', ['Internal Condition Inspection', 'Leakage Inspection', 'Structural Assessment', 'Water Quality Review']),
  CG('svc_maintenance', 'Water Tank Maintenance', 'Service Categories', ['Tank Cleaning Schedule Management', 'Preventive Maintenance', 'Minor Repair Coordination', 'Overflow System Inspection']),
  CG('svc_commercial', 'Commercial Water Tank Services', 'Service Categories', ['Office Buildings', 'Shopping Centres', 'Retail Complexes', 'Commercial Towers', 'Hotels', 'Guest Houses', 'Resorts', 'Restaurants', 'Cafés', 'Schools', 'Colleges', 'Universities', 'Training Centres', 'Clinics', 'Hospitals', 'Medical Centres', 'Factories', 'Warehouses', 'Manufacturing Facilities']),
  CG('svc_repair', 'Water Tank Repair Services', 'Service Categories', ['Crack Repair', 'Leakage Repair', 'Valve Replacement', 'Pipe Connection Repair', 'Tank Recoating', 'Waterproofing', 'Structural Reinforcement']),
  CG('svc_supply', 'Water Supply System Services', 'Service Categories', ['Water Pump Inspection', 'Pump Maintenance', 'Pump Replacement Coordination', 'Water Line Inspection', 'Leak Detection', 'Pipe Maintenance Coordination']),
  CG('svc_quality', 'Water Quality Management', 'Service Categories', ['Drinking Water Testing', 'Water Quality Assessment', 'Contamination Assessment', 'Filtration System Installation', 'Water Purification Coordination', 'Water Softener Coordination']),
  CG('amc_residential', 'Residential AMC', 'Service Categories', ['Basic Package', 'Standard Package', 'Premium Package']),
  CG('amc_commercial', 'Commercial AMC', 'Service Categories', ['Commercial Building Package', 'Hotel & Restaurant Package', 'School & Hospital Package']),

  // 3. Property / Facility
  CG('property_type', 'Property Type', 'Property & Facility', ['House', 'Apartment', 'Apartment Building', 'Residential Complex', 'Office Building', 'Shopping Centre', 'Hotel', 'Restaurant', 'School', 'Hospital', 'Factory', 'Warehouse', 'Other']),
  CG('tank_type', 'Tank Type', 'Property & Facility', ['Rooftop Tank', 'Underground Tank', 'RCC Tank', 'Plastic Tank', 'Steel Tank', 'Fibreglass Tank', 'Other']),
  F('number_of_tanks', 'Number of Tanks', 'number', 'Property & Facility', { required: false }),
  F('tank_capacity', 'Tank Capacity', 'text', 'Property & Facility', { required: false }),
  CG('known_issues', 'Known Issues', 'Property & Facility', ['Contamination', 'Algae Growth', 'Leakage', 'Structural Damage', 'Water Quality Concerns', 'Pump Issues', 'Pipe Issues', 'Other']),

  // 4. Scope of Services
  CG('scope', 'Seventh Sky may coordinate', 'Scope of Services', ['Site Assessments', 'Water Tank Cleaning', 'Water Tank Disinfection', 'Water Tank Inspections', 'Water Tank Repairs', 'Water Quality Testing', 'Water Treatment Services', 'Pump Services', 'Pipeline Services', 'AMC Programs', 'Contractor Coordination', 'Warranty Coordination', 'Insurance Coordination']),

  // 5–7. Editable terms (prefilled)
  F('third_party_terms', 'Third-Party Service Providers', 'textarea', 'Terms', { required: false, default:
`The Client acknowledges that many services may be delivered by independent third-party service providers. Accordingly, Seventh Sky may engage appropriately qualified contractors, coordinate testing laboratories, repair contractors, water treatment specialists and maintenance providers.
Third-party providers remain responsible for their technical services and workmanship; testing laboratories remain responsible for testing results; manufacturers remain responsible for product warranties.` }),
  F('client_responsibilities', 'Client Responsibilities', 'textarea', 'Terms', { required: false, default:
`The Client agrees to provide accurate information, site access and safe access; cooperate with inspections, cleaning activities and testing requirements; make payments when due; and review reports and recommendations.` }),
  F('project_stages', 'Project Stages', 'textarea', 'Terms', { required: false, default:
`Projects may include: Stage 1 – Consultation; Stage 2 – Site Assessment; Stage 3 – Quotation; Stage 4 – Approval; Stage 5 – Service Delivery; Stage 6 – Inspection; Stage 7 – Reporting; Stage 8 – Completion; Stage 9 – Maintenance; Stage 10 – AMC Management.` }),
  F('special_conditions', 'Special Conditions', 'textarea', 'Special Conditions', { required: false }),
];

const SIGNERS = [
  { role: 'customer', label: 'Client', order: 1 },
  { role: 'seventh_sky', label: 'Seventh Sky Representative', order: 2 },
];

const V = (k) => `{{${k}}}`;

const CONTENT_HTML = `
<h1 style="text-align:center">Water Tank Cleaning &amp; Maintenance — Customer Service Agreement</h1>
<p>This Customer Service Agreement (&ldquo;Agreement&rdquo;) is entered into on ${V('agreement_date')} between
<strong>Seventh Sky Property Care</strong> (&ldquo;Seventh Sky&rdquo;) and <strong>${V('customer_name')}</strong>
of ${V('customer_address')} (Phone ${V('customer_phone')}, Email ${V('customer_email')}) (the &ldquo;Client&rdquo;).</p>

<h3>1. Purpose of Agreement</h3>
<p>The purpose of this Agreement is to establish the terms and conditions under which Seventh Sky shall coordinate,
arrange and facilitate water tank cleaning, maintenance, repair, inspection, water quality and related services for
the Client. The Client acknowledges that Seventh Sky primarily acts as:</p>
${V('purpose_roles')}
<p>unless expressly stated otherwise.</p>

<h3>2. Service Categories</h3>
<p>The Client may select one or more services. Only selected services shall apply.</p>
<p><strong>A. Residential — Water Tank Cleaning</strong></p>${V('svc_cleaning')}
<p><strong>Water Tank Disinfection</strong></p>${V('svc_disinfection')}
<p><strong>Water Tank Inspection</strong></p>${V('svc_inspection')}
<p><strong>Water Tank Maintenance</strong></p>${V('svc_maintenance')}
<p><strong>B. Commercial Water Tank Services</strong></p>${V('svc_commercial')}
<p><strong>C. Water Tank Repair Services</strong></p>${V('svc_repair')}
<p><strong>D. Water Supply System Services</strong></p>${V('svc_supply')}
<p><strong>E. Water Quality Management</strong></p>${V('svc_quality')}
<p><strong>F. Annual Maintenance Contracts (AMC) — Residential</strong></p>${V('amc_residential')}
<p><strong>Commercial AMC</strong></p>${V('amc_commercial')}

<h3>3. Property / Facility Details</h3>
<p><strong>Property Type</strong></p>${V('property_type')}
<p><strong>Tank Type</strong></p>${V('tank_type')}
<p>Number of Tanks: ${V('number_of_tanks')} &nbsp;·&nbsp; Tank Capacity: ${V('tank_capacity')}</p>
<p><strong>Known Issues</strong></p>${V('known_issues')}

<h3>4. Scope of Services</h3>
<p>Depending on services selected, Seventh Sky may coordinate:</p>${V('scope')}

<h3>5. Third-Party Service Providers</h3>
<p>${V('third_party_terms')}</p>

<h3>6. Client Responsibilities</h3>
<p>${V('client_responsibilities')}</p>

<h3>7. Project Stages</h3>
<p>${V('project_stages')}</p>

<h3>Special Conditions</h3>
<p>${V('special_conditions')}</p>

<h3>Acceptance</h3>
<p>By signing electronically below, the Parties confirm they have read, understood and accepted all terms of this Agreement.</p>
<p style="margin-top:24px"><strong>Client:</strong> ${V('customer_name')} &nbsp; Signature: __________________ &nbsp; Date: __________</p>
<p><strong>For Seventh Sky Property Care:</strong> Signature: __________________ &nbsp; Date: __________</p>
`;

(async () => {
  try {
    await sequelize.authenticate();
    const existing = await AgreementTemplate.findOne({ where: { name: NAME } });
    const payload = {
      name: NAME, category: 'customer_service', vertical: 'water_tank', status: 'active',
      description: 'Water tank customer service agreement — checkbox-group service selection + editable terms. No KYC.',
      content_html: CONTENT_HTML, fields: FIELDS, signers: SIGNERS,
      source_filename: 'Water Tank CM - Customer Service Agreement - V0.1.docx',
    };
    if (existing) { await existing.update(payload); console.log(`✓ Updated template #${existing.id} "${NAME}" (${FIELDS.length} fields, ${FIELDS.filter((f) => f.type === 'checkbox_group').length} checkbox groups)`); }
    else { const t = await AgreementTemplate.create(payload); console.log(`✓ Created template #${t.id} "${NAME}"`); }
    process.exit(0);
  } catch (e) { console.error('✗ Seed failed:', e.message); process.exit(1); }
})();
