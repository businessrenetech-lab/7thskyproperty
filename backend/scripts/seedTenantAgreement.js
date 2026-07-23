/**
 * Seeds (or refreshes) the FULL Residential Tenancy / Lease Agreement (19 clauses
 * + signature/witness blocks) reproduced verbatim from the client's document.
 * Checkbox groups: Property Type (Clause 2), Minimum Lease Period (Clause 3.1).
 * Fill blanks (parties, rent, dates, reps, witnesses) are text/date fields.
 * Drives the tenant KYC intake. Idempotent by name. Run from backend dir:
 *   node scripts/seedTenantAgreement.js
 */
require('dotenv').config();
const sequelize = require('../config/db.config');
const AgreementTemplate = require('../models/AgreementTemplate');

const NAME = 'Residential Tenancy / Lease Agreement';

const F = (key, label, type, group, extra = {}) => ({ key, label, type, group, required: extra.required !== false, ...extra });
const CG = (key, label, group, options, required = false) => F(key, label, 'checkbox_group', group, { options, required });

const FIELDS = [
  // Parties — Seventh Sky
  F('agreement_date', 'Agreement Date', 'date', 'Parties', { required: false }),
  F('ss_address', 'Seventh Sky Address', 'text', 'Parties', { required: false }),
  F('ss_email', 'Seventh Sky Email', 'text', 'Parties', { required: false }),
  F('ss_phone', 'Seventh Sky Phone', 'text', 'Parties', { required: false }),
  F('ss_rep_name', 'Represented By (Name)', 'text', 'Parties'),
  F('ss_rep_position', 'Position', 'text', 'Parties', { required: false }),

  // Tenant
  F('tenant_full_name', 'Tenant Full Name', 'text', 'Tenant'),
  F('tenant_nid', 'National ID / Passport No.', 'text', 'Tenant'),
  F('tenant_current_address', 'Current Address', 'text', 'Tenant'),
  F('tenant_phone', 'Phone', 'tel', 'Tenant'),
  F('tenant_email', 'Email', 'email', 'Tenant'),
  F('tenant_occupation', 'Occupation / Employer', 'text', 'Tenant', { required: false }),
  F('tenant_emergency_contact', 'Emergency Contact', 'text', 'Tenant', { required: false }),

  // Property (Clause 2)
  F('property_address', 'Property Address', 'text', 'Property'),
  CG('property_type', 'Property Type', 'Property', ['Apartment', 'House', 'Duplex', 'Furnished Apartment', 'Other']),
  F('property_type_other', 'Property Type — Other', 'text', 'Property', { required: false }),

  // Lease Term (Clause 3)
  CG('min_lease_period', 'Minimum Lease Period', 'Lease Term', ['6 Months', 'Other']),
  F('min_lease_other', 'Minimum Lease Period — Other', 'text', 'Lease Term', { required: false }),
  F('lease_start_date', 'Lease Start Date', 'date', 'Lease Term'),
  F('lease_end_date', 'Lease End Date', 'date', 'Lease Term'),

  // Rent (Clause 4)
  F('monthly_rent', 'Monthly Rent Amount', 'currency', 'Rent & Deposit'),
  F('rent_due_date', 'Rent Due Date Each Month', 'text', 'Rent & Deposit'),
  F('payment_method', 'Payment Method', 'select', 'Rent & Deposit', { options: ['Bank transfer / EFT', 'bKash', 'Nagad', 'Cash', 'Cheque'] }),

  // Authorised Representatives (Clause 14) — Seventh Sky reuses ss_rep_*; tenant relationship here
  F('tenant_auth_relationship', 'Tenant Representative — Relationship', 'text', 'Representatives', { required: false }),

  // Execution — witnesses
  F('witness1_name', 'Witness 1 — Name', 'text', 'Execution', { required: false }),
  F('witness2_name', 'Witness 2 — Name', 'text', 'Execution', { required: false }),
];

const SIGNERS = [
  { role: 'tenant', label: 'Tenant', order: 1 },
  { role: 'seventh_sky', label: 'Seventh Sky Representative', order: 2 },
];

const V = (k) => `{{${k}}}`;
const ul = (items) => '<ul>' + items.map((i) => `<li>${i}</li>`).join('') + '</ul>';

const CONTENT_HTML = `
<h1 style="text-align:center">Residential Tenancy / Lease Agreement</h1>

<h3>Agreement</h3>
<p>This Residential Tenancy / Lease Agreement (&ldquo;Agreement&rdquo;) is entered into on ${V('agreement_date')}.</p>
<p><strong>BETWEEN:</strong><br/>Seventh Sky Property Care<br/>Acting on behalf of the Property Owner / Landlord<br/>
Address: ${V('ss_address')}<br/>Email: ${V('ss_email')}<br/>Phone: ${V('ss_phone')}<br/>
Represented by: ${V('ss_rep_name')}<br/>Position: ${V('ss_rep_position')}<br/>
(Hereinafter referred to as &ldquo;Seventh Sky&rdquo;, &ldquo;Property Manager&rdquo;, or &ldquo;Landlord Representative&rdquo;)</p>
<p><strong>AND</strong><br/>Tenant Details<br/>
Full Name: ${V('tenant_full_name')}<br/>National ID / Passport No.: ${V('tenant_nid')}<br/>
Current Address: ${V('tenant_current_address')}<br/>Phone: ${V('tenant_phone')}<br/>Email: ${V('tenant_email')}<br/>
Occupation / Employer: ${V('tenant_occupation')}<br/>Emergency Contact: ${V('tenant_emergency_contact')}<br/>
(Hereinafter referred to as the &ldquo;Tenant&rdquo;)</p>
<p>Collectively referred to as the &ldquo;Parties&rdquo;.</p>

<h3>1. Purpose of Agreement</h3>
<p>This Agreement sets out the terms and conditions under which the Tenant shall occupy and use the residential property described below subject to the rules, obligations, conditions, and tenancy requirements stated herein.</p>

<h3>2. Property Details</h3>
<p>Property Address: ${V('property_address')}</p>
<p>Property Type:</p>${V('property_type')}
<p>Other: ${V('property_type_other')}</p>

<h3>3. Lease Term</h3>
<p><strong>3.1 Minimum Lease Period</strong></p>
<p>The minimum tenancy period under this Agreement shall be:</p>${V('min_lease_period')}
<p>Other: ${V('min_lease_other')}</p>
<p>Lease Start Date: ${V('lease_start_date')}<br/>Lease End Date: ${V('lease_end_date')}</p>
<p><strong>3.2 Renewal</strong></p>
<p>Any lease renewal shall be subject to:</p>
${ul(['mutual agreement,', 'updated rental terms,', 'satisfactory tenancy history,', 'and written approval from Seventh Sky and/or the Owner.'])}

<h3>4. Rent, Security Deposit &amp; Payment Terms</h3>
<p><strong>4.1 Monthly Rent</strong></p>
<p>Monthly Rent Amount: ${V('monthly_rent')}<br/>Rent Due Date Each Month: ${V('rent_due_date')}<br/>Payment Method: ${V('payment_method')}</p>
<p><strong>4.2 Advance Payment &amp; Security Deposit</strong></p>
<p>Before occupying the property, the Tenant shall pay:</p>
<p>A. Advance Rent — Minimum 1 month advance rent</p>
<p>B. Security Bond / Deposit — Minimum 2 months equivalent rent as refundable security bond</p>
<p><strong>4.3 Bond Adjustment &amp; Refund</strong></p>
<p>The security bond shall generally be refunded after tenancy completion and final inspection. The Owner and/or Seventh Sky may deduct from the bond:</p>
${ul(['unpaid rent,', 'unpaid bills,', 'damage repair costs,', 'cleaning costs,', 'replacement costs,', 'or other outstanding liabilities.'])}
<p>Normal wear and tear shall be assessed reasonably. Bond adjustment records may be documented through:</p>
${ul(['inspection reports,', 'invoices,', 'photos,', 'videos,', 'maintenance records,', 'and operational records.'])}
<p><strong>4.4 Late Payment</strong></p>
<p>Rent must be paid on time. Repeated delayed payments may constitute breach of agreement. Seventh Sky reserves the right to issue:</p>
${ul(['notices,', 'penalties,', 'tenancy warnings,', 'or commence lawful recovery processes where required.'])}

<h3>5. Tenant Responsibilities</h3>
<p>The Tenant agrees to:</p>
${ul(['Use the property lawfully and responsibly.', 'Maintain cleanliness and reasonable care of the property.', 'Pay rent, bills, and approved charges on time.', 'Immediately report maintenance or safety concerns.', 'Cooperate with inspections and maintenance access.', 'Comply with building management rules and regulations.', 'Act respectfully toward neighbours and surrounding community.', 'Maintain peaceful and lawful conduct.', 'Comply with health and safety requirements at all times.', 'Provide accurate and truthful information to Seventh Sky.', 'Avoid unlawful, fraudulent, dangerous, environmentally harmful, disruptive, or unsafe activities.'])}
<p>Take reasonable care to prevent:</p>
${ul(['damage,', 'safety risks,', 'environmental hazards,', 'water leakage,', 'fire hazards,', 'electrical misuse,', 'sanitation issues,', 'or property deterioration.'])}

<h3>6. False Information &amp; Fraud</h3>
<p>Any false, misleading, fraudulent, or materially incorrect information provided by the Tenant may constitute serious breach of agreement. Seventh Sky may immediately terminate this Agreement where:</p>
${ul(['fraudulent conduct,', 'criminal activity,', 'forged documentation,', 'or serious misrepresentation'])}
<p>is identified. In such cases:</p>
${ul(['refunds may be withheld where legally permissible,', 'the Tenant may be required to vacate the property within a maximum period of 4 weeks,', 'and damages or losses may remain recoverable.'])}

<h3>7. Occupants, Subletting &amp; Additional Residents</h3>
<p><strong>7.1 Occupant Declaration Requirement</strong></p>
<p>Before occupying the property, the Tenant must provide details of all intended occupants residing at the property including:</p>
${ul(['Full Name', 'Photo ID / National ID / Passport Copy', 'Relationship with Tenant', 'Contact Number', 'Occupation (if requested)'])}
<p>Seventh Sky reserves the right to request updated occupant records where reasonably required.</p>
<p><strong>7.2 Subleasing Restriction</strong></p>
<p>The Tenant must not:</p>
${ul(['sublease,', 'transfer,', 'rent,', 'or share the property'])}
<p>with any third party without prior written approval from Seventh Sky. Any approval shall remain subject to Owner approval.</p>
<p><strong>7.3 Additional Occupants</strong></p>
<p>The Tenant must notify and obtain approval from Seventh Sky if:</p>
${ul(['any relative,', 'friend,', 'guest,', 'or additional occupant'])}
<p>intends to stay at the property for more than 1 month. Unauthorized long-term occupancy may constitute breach of agreement.</p>

<h3>8. Property Alterations &amp; Damage</h3>
<p>The Tenant must not:</p>
${ul(['alter,', 'renovate,', 'repair,', 'modify,', 'drill,', 'install fixtures,', 'or make holes in walls'])}
<p>without prior written approval from Seventh Sky. Any approved work shall remain subject to Owner approval. Any property damage caused by:</p>
${ul(['negligence,', 'misuse,', 'unauthorised alteration,', 'unsafe conduct,', 'environmental damage,', 'or tenant misconduct'])}
<p>may be charged to the Tenant. Repair costs may be deducted from the bond where required.</p>

<h3>9. Inspection &amp; Property Access</h3>
<p>The Tenant agrees to reasonably cooperate and allow access to Seventh Sky, authorised contractors, inspectors, or representatives for the following purposes where reasonably required:</p>
${ul(['inspections,', 'repairs,', 'maintenance,', 'emergencies,', 'safety concerns,', 'property monitoring,', 'or agreed services.'])}
<p>Reasonable notice shall generally be provided unless emergency access becomes necessary.</p>

<h3>10. Property Access, Inspection &amp; Property Management Services</h3>
<p><strong>10.1 Property Access &amp; Cooperation Requirement</strong></p>
<p>The Tenant acknowledges and agrees that Seventh Sky, acting on behalf of the Property Owner / Landlord, may require reasonable access to the property for:</p>
${ul(['property management,', 'inspection,', 'maintenance,', 'operational,', 'safety,', 'marketing,', 'or tenancy-related purposes.'])}
<p>The Tenant agrees to reasonably cooperate and allow access to:</p>
${ul(['Seventh Sky,', 'authorised contractors,', 'maintenance personnel,', 'inspectors,', 'photographers,', 'agents,', 'or representatives'])}
<p>where reasonably required. Reasonable notice shall generally be provided unless emergency access becomes necessary.</p>
<p><strong>10.2 Property Sale, Re-Rental &amp; Inspection Access</strong></p>
<p>The Tenant agrees that Seventh Sky may organise:</p>
${ul(['property inspections,', 'property photography,', 'marketing activities,', 'buyer inspections,', 'prospective tenant inspections,', 'valuation inspections,', 'or related property access'])}
<p>where:</p>
${ul(['the Owner intends to sell the property,', 'the property is being advertised for future tenancy,', 'or vacancy / lease termination notice has been exchanged.'])}
<p>The Tenant agrees to reasonably cooperate with such inspections and access arrangements.</p>
<p><strong>10.3 Property Management &amp; Support Services</strong></p>
<p>The Tenant acknowledges that the following services may be coordinated, managed, arranged, monitored, or facilitated by Seventh Sky where reasonably required. Unless specifically stated otherwise in writing, the Tenant acknowledges that:</p>
${ul(['fees &amp; charges may apply,', 'supplier costs may apply,', 'labour and material costs may apply,', 'contractor charges may apply,', 'and service availability may depend on operational requirements and approvals.'])}
<p>The Tenant further agrees to reasonably cooperate with access requirements necessary for carrying out these services.</p>
<p><strong>Property Care Services</strong></p>${ul(['Cleaning Services', 'Gardening &amp; Landscaping', 'Utility Bill Coordination', 'Caretaker Coordination', 'Emergency Assistance for Tenant upon request (Fees &amp; charges apply)'])}
<p><strong>Repair &amp; Maintenance</strong></p>${ul(['General Repairs &amp; Maintenance', 'Painting', 'Renovation', 'Work Progress Tracking', 'Before &amp; After Work Photos'])}
<p><strong>Inspection Services</strong></p>${ul(['Entry Inspection', 'Routine Inspection', 'Exit Inspection', 'Inspection Reporting &amp; Photo Documentation'])}
<p><strong>Lifestyle &amp; Convenience Support for Tenant upon request (Fees &amp; charges apply)</strong></p>${ul(['Relocation Support', 'Property Preparation Before Arrival', 'Utility Setup Coordination'])}
<p><strong>Property Presentation Support for Tenant upon request (Fees &amp; charges apply)</strong></p>${ul(['Furnishing Coordination', 'Property Styling Assistance', 'Seasonal Preparation Support'])}
<p><strong>Personalised Assistance for Tenant upon request (Fees &amp; charges apply)</strong></p>${ul(['Emergency Coordination', 'Priority Client Assistance', 'Custom Support Requests'])}
<p><strong>Smart Property Solutions for Tenant upon request (Fees &amp; charges apply)</strong></p>${ul(['CCTV Installation', 'Smart Lock Installation', 'Smart Home Setup Support', 'Remote Monitoring Coordination'])}
<p><strong>Property Security Support for Tenant upon request (Fees &amp; charges apply)</strong></p>${ul(['Security Guard Coordination', 'Property Monitoring', 'Vacant Property Checks', 'Emergency Property Response'])}
<p><strong>Corporate Relocation Services for Tenant upon request (Fees &amp; charges apply)</strong></p>${ul(['Employee Relocation Support', 'Temporary Accommodation Coordination', 'Office Relocation Assistance'])}
<p><strong>NRB Dedicated Services</strong></p>${ul(['NRB Property Monitoring', 'Overseas Owner Reporting', 'Remote Property Coordination', 'Periodic Video Inspection Reports'])}

<h3>10A. Non-Circumvention, Exclusive Tenant Introduction, Communication &amp; Rental Commission Protection</h3>
<p>The Tenant expressly acknowledges and agrees that:</p>
<p>Seventh Sky may invest substantial:</p>
${ul(['operational resources,', 'property marketing effort,', 'tenant screening effort,', 'inspection coordination,', 'property preparation support,', 'communication management,', 'tenancy administration,', 'negotiation support,', 'industry relationships,', 'and confidential operational information'])}
<p>during the tenancy coordination and leasing process.</p>
<p>The Tenant acknowledges that the property, Owner, Landlord, rental opportunity, operational coordination, and tenancy arrangement introduced through Seventh Sky shall remain a protected introduction of Seventh Sky.</p>
<p>During the active tenancy negotiation period and throughout the tenancy period, the Tenant must not:</p>
${ul(['bypass Seventh Sky,', 'privately negotiate with the Owner,', 'directly coordinate tenancy arrangements outside Seventh Sky,', 'independently renew tenancy,', 'independently alter financial arrangements,', 'or attempt to avoid payment of service fees, management fees, leasing fees, commissions, or agreed charges payable to Seventh Sky.'])}
<p>All:</p>
${ul(['tenancy negotiations,', 'rental discussions,', 'renewal discussions,', 'payment coordination,', 'occupancy discussions,', 'lease amendments,', 'tenancy concerns,', 'and operational matters'])}
<p>shall be coordinated, facilitated, managed, or acknowledged through Seventh Sky unless otherwise approved in writing.</p>
<p>The Tenant must not:</p>
${ul(['intentionally conceal communication,', 'hide tenancy negotiations,', 'privately coordinate rental arrangements,', 'transfer communication outside Seventh Sky,', 'or attempt to independently continue tenancy with the Owner'])}
<p>for the purpose of avoiding Seventh Sky&rsquo;s operational involvement, fees, service charges, management fees, or commission structure.</p>
<p>If the Tenant:</p>
${ul(['bypasses Seventh Sky,', 'independently coordinates tenancy with the Owner,', 'privately renews tenancy,', 'privately continues occupancy,', 'or circumvents Seventh Sky'])}
<p>after introduction through Seventh Sky, Seventh Sky shall remain fully entitled to recover:</p>
${ul(['agreed leasing fees,', 'management fees,', 'operational costs,', 'commission,', 'damages,', 'legal recovery costs,', 'and financial losses'])}
<p>from the Tenant regardless of whether the tenancy arrangement continues privately between the Tenant and Owner.</p>
<p>The Tenant acknowledges that:</p>
${ul(['owner information,', 'rental terms,', 'pricing discussions,', 'operational discussions,', 'inspection arrangements,', 'and tenancy coordination information'])}
<p>introduced through Seventh Sky remain commercially confidential. Any breach of this clause may result in:</p>
${ul(['legal action,', 'tenancy recovery proceedings,', 'compensation claims,', 'commission recovery,', 'operational damage claims,', 'injunction applications,', 'and recovery of legal costs incurred by Seventh Sky.'])}
<p>CRM records, inspection records, emails, WhatsApp communication, SMS records, digital approvals, payment history, tenancy records, and operational communication logs may be relied upon as evidentiary records for enforcement of this clause.</p>
<p>This clause shall survive tenancy termination, lease expiry, vacancy, suspension, or cancellation of this Agreement for a period of twenty-four (24) months from the date of tenant introduction.</p>

<h3>10B. Tenant Indemnity, Risk Disclaimer &amp; Liability Limitation</h3>
<p>The Tenant expressly acknowledges and agrees that:</p>
<p>Seventh Sky Property Care, its directors, employees, contractors, consultants, representatives, coordinators, and associated personnel shall:</p>
${ul(['coordinate tenancy management,', 'inspections,', 'maintenance support,', 'communication,', 'operational support,', 'and corrective coordination'])}
<p>to the best of their knowledge, operational capability, practical industry experience, and in good faith.</p>
<p>Seventh Sky does not guarantee protection against:</p>
${ul(['accidents,', 'injury,', 'theft,', 'environmental issues,', 'electrical faults,', 'utility interruptions,', 'structural defects,', 'criminal conduct,', 'neighbour disputes,', 'natural disasters,', 'third-party conduct,', 'or unforeseen operational incidents beyond reasonable control.'])}
<p>Seventh Sky shall not be held responsible or liable for:</p>
${ul(['tenant-caused damage,', 'owner-caused issues,', 'structural defects,', 'utility failures,', 'environmental incidents,', 'criminal activity,', 'contractor negligence,', 'neighbour disputes,', 'natural disasters,', 'third-party actions,', 'or operational consequences beyond reasonable control.'])}
<p>The Tenant provides complete indemnity and protection to Seventh Sky against:</p>
${ul(['legal claims,', 'financial loss,', 'injury claims,', 'environmental claims,', 'compensation claims,', 'disputes,', 'court proceedings,', 'and regulatory matters'])}
<p>arising from tenancy conduct, occupancy behaviour, misuse of property, unsafe activity, unlawful conduct, or incidents occurring during occupancy beyond Seventh Sky&rsquo;s reasonable operational control.</p>

<h3>11. Tenancy Termination &amp; Vacancy Notice</h3>
<p><strong>11.1 Standard Vacancy Notice</strong></p>
<p>The Tenant must provide minimum 3 months written notice before vacating the property. Vacancy notice should preferably include:</p>
${ul(['intended move-out date,', 'forwarding contact details,', 'and inspection coordination details.'])}
<p><strong>11.2 Early Lease Termination</strong></p>
<p>If the Tenant wishes to terminate the lease before expiry: The Tenant may remain liable for:</p>
${ul(['remaining rent,', 'vacancy-related losses,', 'remarketing expenses,', 'replacement tenant costs,', 'operational losses,', 'and agreed penalties.'])}
<p>Seventh Sky and/or the Owner may alternatively agree to an early settlement arrangement. The Tenant shall reasonably cooperate with:</p>
${ul(['inspections,', 'remarketing,', 'photography,', 'and operational coordination.'])}
<p><strong>11.3 Termination by Seventh Sky / Owner</strong></p>
<p>Seventh Sky and/or the Owner may terminate this Agreement where:</p>
${ul(['rent remains unpaid,', 'illegal activity occurs,', 'property damage occurs,', 'serious misconduct occurs,', 'false information is provided,', 'building rules are repeatedly breached,', 'or material breach occurs.'])}

<h3>12. Utilities &amp; Other Expenses</h3>
<p>Unless otherwise agreed, the Tenant shall remain responsible for:</p>
${ul(['electricity,', 'gas,', 'internet,', 'water,', 'utility usage,', 'building charges,', 'parking,', 'and other applicable service costs relating to tenancy use.'])}

<h3>13. Workflow, Communication &amp; CRM Records</h3>
<p>The Tenant acknowledges that Seventh Sky may maintain:</p>
${ul(['tenancy records,', 'communication logs,', 'payment history,', 'inspection reports,', 'maintenance records,', 'photos,', 'videos,', 'complaints,', 'incident records,', 'and operational updates.'])}
<p>The Tenant agrees that email, WhatsApp, SMS, CRM records, digital approvals, and signed documents may be treated as official communication and evidentiary records.</p>

<h3>14. Authorized Representatives</h3>
<p><strong>On Behalf of Seventh Sky</strong><br/>Name: ${V('ss_rep_name')}<br/>Position: ${V('ss_rep_position')}</p>
<p><strong>On Behalf of Tenant</strong><br/>Name: ${V('tenant_full_name')}<br/>Relationship: ${V('tenant_auth_relationship')}</p>
<p>Only authorised representatives may:</p>
${ul(['approve variations,', 'request amendments,', 'approve access,', 'request termination,', 'or authorise significant tenancy instructions.'])}

<h3>15. Liability Limitation</h3>
<p>Seventh Sky shall exercise reasonable professional care in managing tenancy-related services. Seventh Sky does not guarantee:</p>
${ul(['uninterrupted utility services,', 'actions of neighbours,', 'third-party contractor performance,', 'or external events beyond reasonable control.'])}
<p>Seventh Sky shall not be liable for indirect or consequential losses.</p>

<h3>16. Force Majeure</h3>
<p>Neither Party shall be liable for delays or disruptions caused by:</p>
${ul(['natural disasters,', 'political unrest,', 'government restrictions,', 'utility failures,', 'pandemics,', 'strikes,', 'or other events beyond reasonable control.'])}

<h3>17. Dispute Resolution</h3>
<p>The Parties shall first attempt to resolve disputes amicably. If unresolved, mediation may be attempted. If disputes remain unresolved, the matter may be referred to competent courts within Bangladesh. This Agreement shall be governed by the laws of Bangladesh.</p>

<h3>18. Entire Agreement</h3>
<p>This Agreement represents the complete understanding between the Parties. Any prior verbal discussion shall not override this Agreement unless confirmed in writing.</p>

<h3>19. Acceptance</h3>
<p>By signing below, both Parties acknowledge that they:</p>
${ul(['have read and understood this Agreement,', 'voluntarily accept its terms,', 'and agree to comply with all obligations stated herein.'])}

<p><strong>SIGNED FOR SEVENTH SKY PROPERTY CARE</strong><br/>Name: ${V('ss_rep_name')}<br/>Position: ${V('ss_rep_position')}<br/>Signature: __________________<br/>Date: __________</p>
<p><strong>SIGNED BY TENANT</strong><br/>Name: ${V('tenant_full_name')}<br/>Signature: __________________<br/>Date: __________</p>
<p><strong>WITNESS 1</strong><br/>Name: ${V('witness1_name')}<br/>Signature: __________________<br/>Date: __________</p>
<p><strong>WITNESS 2</strong><br/>Name: ${V('witness2_name')}<br/>Signature: __________________<br/>Date: __________</p>
`;

(async () => {
  try {
    await sequelize.authenticate();
    const existing = await AgreementTemplate.findOne({ where: { name: NAME } });
    const payload = {
      name: NAME, category: 'tenancy', vertical: 'rental', status: 'active',
      description: 'Full Residential Tenancy / Lease Agreement (19 clauses, verbatim) — checkbox property/lease selection + tenant KYC intake.',
      content_html: CONTENT_HTML, fields: FIELDS, signers: SIGNERS,
      source_filename: 'Residential Property Tenancy Management Service Agreement - V0.1.docx',
    };
    if (existing) { await existing.update(payload); console.log(`✓ Updated template #${existing.id} "${NAME}" (${FIELDS.length} fields, ${FIELDS.filter((f) => f.type === 'checkbox_group').length} checkbox groups)`); }
    else { const t = await AgreementTemplate.create(payload); console.log(`✓ Created template #${t.id} "${NAME}"`); }
    process.exit(0);
  } catch (e) { console.error('✗ Seed failed:', e.message); process.exit(1); }
})();
