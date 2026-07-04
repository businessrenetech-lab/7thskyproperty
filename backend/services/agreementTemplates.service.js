/**
 * agreementTemplates.service.js
 * ------------------------------------------------------------------
 * Generates real, prefilled agreement documents (HTML for the signing
 * envelope) plus a structured `terms` object per role.
 *
 * The terms object is the automation contract: whatever is agreed here is
 * synced back into the operational records when the envelope completes
 * (see partyRoleActivation.service.applyTermsSync). Nothing is typed twice.
 *
 * Builders:
 *   buildTenancyAgreement({ tenancy, property, owner, tenant, application, overrides })
 *   buildManagementAgreement({ property, owner, ownerProfile, overrides })      — landlord
 *   buildSalesAgencyAgreement({ property, vendor, overrides })                  — vendor/seller
 *   buildBuyerServiceAgreement({ buyer, overrides })
 *   buildSupplierAgreement({ supplier, overrides })
 */

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dt = (v) => (v ? String(v).slice(0, 10) : '____________');
const or = (v, fallback = '____________') => (v == null || v === '' ? fallback : v);

/** Shared A4-print shell so every agreement looks consistent + brand-correct. */
function shell(title, bodyHtml, footerNote) {
  return `
<div style="font-family: Georgia, 'Times New Roman', serif; color: #1f2430; line-height: 1.65; font-size: 14px;">
  <div style="text-align: center; border-bottom: 3px double #1e3a8a; padding-bottom: 14px; margin-bottom: 22px;">
    <div style="font-size: 21px; font-weight: bold; color: #1e3a8a;">Seventh Sky Property Care</div>
    <div style="font-size: 11px; color: #6b7280; letter-spacing: 1px; text-transform: uppercase;">Built on Trust · Driven by Care</div>
    <div style="font-size: 17px; font-weight: bold; margin-top: 14px; text-transform: uppercase; letter-spacing: 0.5px;">${title}</div>
  </div>
  ${bodyHtml}
  <div style="margin-top: 26px; padding-top: 12px; border-top: 1px solid #d1d5db; font-size: 11px; color: #6b7280;">
    ${footerNote || 'This agreement becomes effective when signed by all parties through the Seventh Sky electronic signing system. The electronic record, audit trail and content hash constitute proof of execution.'}
  </div>
</div>`;
}

const row = (label, value) => `
  <tr>
    <td style="padding: 5px 10px; border: 1px solid #d1d5db; background: #f8fafc; width: 38%; font-weight: bold; font-size: 12.5px;">${label}</td>
    <td style="padding: 5px 10px; border: 1px solid #d1d5db; font-size: 12.5px;">${value}</td>
  </tr>`;
const table = (rows) => `<table style="width: 100%; border-collapse: collapse; margin: 10px 0;">${rows}</table>`;
const section = (n, title, body) => `
  <div style="margin: 16px 0;">
    <div style="font-weight: bold; font-size: 14px; color: #1e3a8a;">${n}. ${title}</div>
    <div style="margin-top: 5px;">${body}</div>
  </div>`;

// ═══ TENANCY AGREEMENT ═══════════════════════════════════════════════════════
function buildTenancyAgreement({ tenancy, property, owner, tenant, application, overrides = {} }) {
  const terms = {
    agreement_type: 'tenancy_agreement',
    monthly_rent: Number(overrides.monthly_rent ?? tenancy?.monthly_rent ?? application?.approved_rent ?? 0),
    service_charge: Number(overrides.service_charge ?? tenancy?.service_charge ?? 0),
    security_deposit: Number(overrides.security_deposit ?? tenancy?.security_deposit ?? 0),
    advance_rent: Number(overrides.advance_rent ?? tenancy?.advance_rent ?? 0),
    rent_due_day: Number(overrides.rent_due_day ?? tenancy?.rent_due_day ?? 5),
    lease_start: overrides.lease_start ?? tenancy?.lease_start ?? application?.lease_start_target ?? null,
    lease_end: overrides.lease_end ?? tenancy?.lease_end ?? null,
    minimum_lease_period_months: Number(overrides.minimum_lease_period_months ?? tenancy?.minimum_lease_period_months ?? 6),
    payment_method: overrides.payment_method ?? tenancy?.payment_method ?? 'Bank transfer / bKash / approved method',
    notice_period_days: Number(overrides.notice_period_days ?? 30),
  };

  const body = `
    <p>This Residential Tenancy Agreement is made between:</p>
    ${table(
      row('Landlord / Owner', `${or(owner?.full_name)} ${owner?.primary_phone ? '· ' + owner.primary_phone : ''}`) +
      row('Managing Agent', 'Seventh Sky Property Care (acting for and on behalf of the Owner)') +
      row('Tenant', `${or(tenant?.full_name || application?.applicant_name)} ${(tenant?.primary_phone || application?.mobile) ? '· ' + (tenant?.primary_phone || application?.mobile) : ''}`) +
      row('Tenant NID / ID', or(tenant?.national_id, 'To be verified against records')) +
      row('Property', `${or(property?.title)} — ${[property?.address, property?.area, property?.district].filter(Boolean).join(', ')}`) +
      row('Property Code', or(property?.property_code))
    )}
    ${section(1, 'Term', `The tenancy commences on <b>${dt(terms.lease_start)}</b> and ends on <b>${dt(terms.lease_end)}</b>, with a minimum lease period of <b>${terms.minimum_lease_period_months} months</b>.`)}
    ${section(2, 'Rent & Charges', table(
      row('Monthly Rent', money(terms.monthly_rent)) +
      row('Service Charge', money(terms.service_charge)) +
      row('Rent Due Day', `Day ${terms.rent_due_day} of each month`) +
      row('Payment Method', terms.payment_method)
    ))}
    ${section(3, 'Deposit & Advance', table(
      row('Security Deposit', money(terms.security_deposit)) +
      row('Advance Rent', money(terms.advance_rent))
    ) + `<p style="font-size: 12.5px;">The security deposit is held against damage beyond normal wear and tear, unpaid rent and unpaid utilities, and is refundable after the exit inspection and deposit settlement.</p>`)}
    ${section(4, 'Tenant Obligations', `<ul style="font-size: 12.5px; margin: 4px 0; padding-left: 20px;">
      <li>Pay rent and service charges on or before the due day.</li>
      <li>Pay utility bills (electricity, gas, water) unless agreed otherwise in writing.</li>
      <li>Keep the property clean and report maintenance issues promptly.</li>
      <li>No subletting or additional occupants without written approval.</li>
      <li>Permit routine inspections with reasonable notice (approximately every 6 months).</li>
      <li>Provide ${terms.notice_period_days} days written notice before vacating.</li>
    </ul>`)}
    ${section(5, 'Management', `The property is managed by Seventh Sky Property Care. All rent payments, maintenance requests, notices and communications must be directed through Seventh Sky. Direct arrangements between tenant and owner that bypass the managing agent are not permitted.`)}
    ${section(6, 'Termination', `Early termination may incur costs including remaining rent liability, re-marketing and administrative costs as applicable. On expiry, renewal requires mutual agreement and updated terms.`)}
  `;

  return {
    title: `Tenancy Agreement — ${or(tenant?.full_name || application?.applicant_name, 'Tenant')} — ${or(property?.title, 'Property')}`,
    html: shell('Residential Tenancy Agreement', body),
    terms,
  };
}

// ═══ MANAGEMENT AGREEMENT (LANDLORD) ════════════════════════════════════════
function buildManagementAgreement({ property, owner, ownerProfile, overrides = {} }) {
  const terms = {
    agreement_type: 'property_management_agreement',
    management_fee_pct: Number(overrides.management_fee_pct ?? ownerProfile?.management_commission ?? property?.management_fee_pct ?? 5),
    onboarding_fee: Number(overrides.onboarding_fee ?? ownerProfile?.onboarding_fee ?? 0),
    rent_due_day: Number(overrides.rent_due_day ?? property?.rent_due_day ?? 5),
    disbursement_frequency: overrides.disbursement_frequency ?? ownerProfile?.disbursement_frequency ?? 'monthly',
    // Bank details — captured in the agreement, synced to owner profile on signing.
    bank_name: overrides.bank_name ?? ownerProfile?.bank_name ?? null,
    bank_branch: overrides.bank_branch ?? ownerProfile?.bank_branch ?? null,
    bank_account_name: overrides.bank_account_name ?? ownerProfile?.bank_account_name ?? null,
    bank_account_number: overrides.bank_account_number ?? ownerProfile?.bank_account_number ?? null,
    bank_routing_number: overrides.bank_routing_number ?? ownerProfile?.bank_routing_number ?? null,
    bkash_number: overrides.bkash_number ?? ownerProfile?.bkash_number ?? null,
    nagad_number: overrides.nagad_number ?? ownerProfile?.nagad_number ?? null,
    preferred_payment: overrides.preferred_payment ?? ownerProfile?.preferred_payment ?? 'bank_transfer',
  };

  const body = `
    <p>This Residential Property Management Agreement is made between:</p>
    ${table(
      row('Owner', `${or(owner?.full_name)} ${owner?.primary_phone ? '· ' + owner.primary_phone : ''}`) +
      row('Owner NID / Passport', or(ownerProfile?.nid_number || ownerProfile?.passport_number, 'On file / to be collected')) +
      row('Managing Agent', 'Seventh Sky Property Care') +
      row('Property', `${or(property?.title)} — ${[property?.address, property?.area, property?.district].filter(Boolean).join(', ')}`) +
      row('Property Code', or(property?.property_code))
    )}
    ${section(1, 'Appointment', `The Owner appoints Seventh Sky Property Care as exclusive managing agent for the property, covering tenant sourcing, screening, rent collection, maintenance coordination, inspections and owner reporting.`)}
    ${section(2, 'Management Fee & Charges', table(
      row('Management Fee', `<b>${terms.management_fee_pct}%</b> of monthly rent collected`) +
      (terms.onboarding_fee > 0 ? row('Onboarding Fee', money(terms.onboarding_fee)) : '') +
      row('Rent Due Day', `Day ${terms.rent_due_day} of each month`) +
      row('Disbursement', `${terms.disbursement_frequency} — after deduction of the management fee and approved expenses`)
    ) + `<p style="font-size: 12.5px;">The first general maintenance coordination request per month is included; materials, labour, transport, contractor and supplier costs remain payable by the Owner.</p>`)}
    ${section(3, 'Owner Disbursement Account', table(
      row('Bank / Branch', `${or(terms.bank_name)} / ${or(terms.bank_branch)}`) +
      row('Account Name', or(terms.bank_account_name)) +
      row('Account Number', or(terms.bank_account_number)) +
      row('Routing Number', or(terms.bank_routing_number)) +
      (terms.bkash_number ? row('bKash', terms.bkash_number) : '') +
      (terms.nagad_number ? row('Nagad', terms.nagad_number) : '') +
      row('Preferred Method', String(terms.preferred_payment).replace(/_/g, ' '))
    ))}
    ${section(4, 'Owner Obligations', `<ul style="font-size: 12.5px; margin: 4px 0; padding-left: 20px;">
      <li>Confirm lawful authority to rent the property and provide ownership documents.</li>
      <li>Approve maintenance expenses above the agreed threshold within a reasonable time.</li>
      <li>The Owner remains responsible for tax and accounting obligations relating to rental income.</li>
      <li>All tenant communication and payments flow through Seventh Sky (non-circumvention).</li>
    </ul>`)}
    ${section(5, 'Inspections & Reporting', `Entry inspection before move-in, routine inspections approximately every 6 months, exit inspection before bond refund. Monthly owner statements itemise rent collected, fees and deductions, and net disbursement.`)}
  `;

  return {
    title: `Property Management Agreement — ${or(owner?.full_name, 'Owner')} — ${or(property?.title, 'Property')}`,
    html: shell('Residential Property Management Agreement', body),
    terms,
  };
}

// ═══ SALES AGENCY AGREEMENT (VENDOR / SELLER) ════════════════════════════════
function buildSalesAgencyAgreement({ property, vendor, overrides = {} }) {
  const terms = {
    agreement_type: 'sales_agency_agreement',
    listing_price: Number(overrides.listing_price ?? property?.price ?? 0),
    commission_pct: Number(overrides.commission_pct ?? 2),
    exclusivity_months: Number(overrides.exclusivity_months ?? 6),
    marketing_budget: Number(overrides.marketing_budget ?? 0),
  };

  const body = `
    <p>This Sales Agency Agreement is made between:</p>
    ${table(
      row('Vendor / Seller', `${or(vendor?.full_name)} ${vendor?.primary_phone ? '· ' + vendor.primary_phone : ''}`) +
      row('Vendor NID / Company Reg', or(vendor?.national_id || vendor?.company_reg_no, 'On file / to be collected')) +
      row('Agent', 'Seventh Sky Property Care') +
      row('Property', `${or(property?.title)} — ${[property?.address, property?.area, property?.district].filter(Boolean).join(', ')}`) +
      row('Property Code', or(property?.property_code))
    )}
    ${section(1, 'Appointment', `The Vendor appoints Seventh Sky Property Care as ${terms.exclusivity_months > 0 ? `<b>exclusive</b> selling agent for ${terms.exclusivity_months} months` : 'selling agent'} for the property.`)}
    ${section(2, 'Price & Commission', table(
      row('Listing Price', money(terms.listing_price)) +
      row('Agency Commission', `<b>${terms.commission_pct}%</b> of the final sale price, payable at settlement`) +
      (terms.marketing_budget > 0 ? row('Marketing Budget', money(terms.marketing_budget)) : '')
    ))}
    ${section(3, 'Vendor Warranties', `<ul style="font-size: 12.5px; margin: 4px 0; padding-left: 20px;">
      <li>The Vendor has lawful authority to sell and clear title to the property.</li>
      <li>All ownership documents (deed, mutation/khatian, tax receipts) provided are genuine.</li>
      <li>Buyers introduced by Seventh Sky remain protected introductions (non-circumvention).</li>
    </ul>`)}
    ${section(4, 'Marketing & Introductions', `Seventh Sky will market the property, arrange inspections, negotiate on the Vendor's behalf and coordinate documentation through to settlement.`)}
  `;

  return {
    title: `Sales Agency Agreement — ${or(vendor?.full_name, 'Vendor')} — ${or(property?.title, 'Property')}`,
    html: shell('Sales Agency Agreement', body),
    terms,
  };
}

// ═══ BUYER SERVICE AGREEMENT ═════════════════════════════════════════════════
function buildBuyerServiceAgreement({ buyer, overrides = {} }) {
  const terms = {
    agreement_type: 'buyer_service_agreement',
    service_fee_pct: Number(overrides.service_fee_pct ?? 1),
    budget_min: Number(overrides.budget_min ?? 0),
    budget_max: Number(overrides.budget_max ?? 0),
  };
  const body = `
    <p>This Buyer Service Agreement is made between:</p>
    ${table(
      row('Buyer', `${or(buyer?.full_name)} ${buyer?.primary_phone ? '· ' + buyer.primary_phone : ''}`) +
      row('Buyer NID / ID', or(buyer?.national_id, 'On file / to be collected')) +
      row('Agent', 'Seventh Sky Property Care')
    )}
    ${section(1, 'Engagement', `The Buyer engages Seventh Sky Property Care to source, shortlist, verify and negotiate residential property purchases on the Buyer's behalf${terms.budget_max ? ` within a budget of ${money(terms.budget_min)} – ${money(terms.budget_max)}` : ''}.`)}
    ${section(2, 'Fees', table(
      row('Buyer Service Fee', `<b>${terms.service_fee_pct}%</b> of the final purchase price, payable at settlement`)
    ))}
    ${section(3, 'Protected Introductions', `Properties introduced by Seventh Sky remain protected introductions. Purchasing an introduced property directly or through another party within 12 months still triggers the service fee (non-circumvention).`)}
    ${section(4, 'Verification', `Seventh Sky coordinates deed/mutation verification and professional advice referrals, but final legal and financial decisions remain the Buyer's responsibility.`)}
  `;
  return {
    title: `Buyer Service Agreement — ${or(buyer?.full_name, 'Buyer')}`,
    html: shell('Buyer Service Agreement', body),
    terms,
  };
}

// ═══ SUPPLIER / SERVICE PROVIDER AGREEMENT ═══════════════════════════════════
function buildSupplierAgreement({ supplier, overrides = {} }) {
  const terms = {
    agreement_type: 'supplier_agreement',
    payment_terms_days: Number(overrides.payment_terms_days ?? 15),
    service_categories: overrides.service_categories ?? '',
  };
  const body = `
    <p>This Supplier / Service Provider Agreement is made between:</p>
    ${table(
      row('Supplier', `${or(supplier?.company_name || supplier?.full_name)} ${supplier?.primary_phone ? '· ' + supplier.primary_phone : ''}`) +
      row('Trade Licence / Reg', or(supplier?.trade_licence_no || supplier?.company_reg_no, 'On file / to be collected')) +
      row('Principal', 'Seventh Sky Property Care')
    )}
    ${section(1, 'Scope', `The Supplier provides ${or(terms.service_categories, 'agreed maintenance and property services')} for properties managed by Seventh Sky, under individual work orders.`)}
    ${section(2, 'Payment', table(
      row('Payment Terms', `Within ${terms.payment_terms_days} days of invoice, after work-order completion and photo evidence`)
    ))}
    ${section(3, 'Standards', `<ul style="font-size: 12.5px; margin: 4px 0; padding-left: 20px;">
      <li>Work performed to professional standard with before/after photo evidence.</li>
      <li>Quotes honoured once accepted; variations require approval before proceeding.</li>
      <li>No direct engagement with Seventh Sky owners or tenants (non-circumvention).</li>
    </ul>`)}
  `;
  return {
    title: `Supplier Agreement — ${or(supplier?.company_name || supplier?.full_name, 'Supplier')}`,
    html: shell('Supplier / Service Provider Agreement', body),
    terms,
  };
}

/** Role → builder mapping used by the role-profile signing flow. */
const ROLE_BUILDERS = {
  landlord: buildManagementAgreement,
  tenant: buildTenancyAgreement,
  vendor: buildSalesAgencyAgreement,
  buyer: buildBuyerServiceAgreement,
  supplier: buildSupplierAgreement,
  third_party: buildSupplierAgreement,
};

module.exports = {
  buildTenancyAgreement,
  buildManagementAgreement,
  buildSalesAgencyAgreement,
  buildBuyerServiceAgreement,
  buildSupplierAgreement,
  ROLE_BUILDERS,
};
