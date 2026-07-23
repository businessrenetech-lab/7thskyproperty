/**
 * serviceAgreementTemplates.service.js
 * ------------------------------------------------------------------
 * Dynamic Property-Care service agreements, auto-populated from CRM records.
 * Each builder returns { title, html, terms }. `terms` is the structured
 * automation contract synced onto the provider/work-order when the envelope
 * completes (see signing → provider agreement_status = 'signed').
 *
 *   buildProviderMasterAgreement({ provider, capabilities, org, overrides })
 *   buildCustomerServiceAgreement({ client, service, quote, org, overrides })
 *   buildServiceWorkOrder({ workOrder, provider, service, client, overrides })
 */
const or = (v, fallback = '__________') => (v == null || v === '' ? fallback : v);
const money = (v) => '৳' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function shell(title, docNo, bodyHtml, footerNote) {
  return `
<div style="font-family: Georgia, 'Times New Roman', serif; color: #1f2430; line-height: 1.65; font-size: 14px;">
  <div style="text-align: center; border-bottom: 3px double #1e3a8a; padding-bottom: 14px; margin-bottom: 8px;">
    <div style="font-size: 21px; font-weight: bold; color: #1e3a8a;">Seventh Sky Property Care</div>
    <div style="font-size: 11px; color: #6b7280; letter-spacing: 1px; text-transform: uppercase;">Built on Trust · Driven by Care</div>
    <div style="font-size: 17px; font-weight: bold; margin-top: 14px; text-transform: uppercase; letter-spacing: 0.5px;">${title}</div>
    ${docNo ? `<div style="font-size: 11px; color: #6b7280; margin-top: 4px;">${docNo}</div>` : ''}
  </div>
  ${bodyHtml}
  <div style="margin-top: 26px; padding-top: 12px; border-top: 1px solid #d1d5db; font-size: 11px; color: #6b7280;">
    ${footerNote || 'This agreement becomes effective when signed by all parties through the Seventh Sky electronic signing system. The electronic record, audit trail and content hash constitute proof of execution.'}
  </div>
</div>`;
}
const row = (label, value) => `<tr><td style="padding:5px 10px;border:1px solid #d1d5db;background:#f8fafc;width:38%;font-weight:bold;font-size:12.5px;">${label}</td><td style="padding:5px 10px;border:1px solid #d1d5db;font-size:12.5px;">${value}</td></tr>`;
const table = (rows) => `<table style="width:100%;border-collapse:collapse;margin:10px 0;">${rows}</table>`;
const section = (n, title, body) => `<div style="margin:15px 0;"><div style="font-weight:bold;font-size:13.5px;color:#1e3a8a;">${n}. ${title}</div><div style="margin-top:4px;font-size:13px;">${body}</div></div>`;
const bullets = (items) => `<ul style="margin:6px 0;padding-left:20px;">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const signBlock = (leftName, rightName) => `
  <table style="width:100%;margin-top:26px;"><tr>
    <td style="width:50%;vertical-align:top;padding-right:16px;">
      <div style="border-top:1px solid #333;padding-top:6px;font-size:12px;"><b>${leftName}</b><br/>Name: __________________<br/>Position: __________________<br/>Signature: __________________<br/>Date: __________________</div>
    </td>
    <td style="width:50%;vertical-align:top;padding-left:16px;">
      <div style="border-top:1px solid #333;padding-top:6px;font-size:12px;"><b>${rightName}</b><br/>Name: __________________<br/>Position: __________________<br/>Signature: __________________<br/>Date: __________________</div>
    </td>
  </tr></table>`;

const ORG = {
  name: 'Seventh Sky Property Care',
  division: 'Seventh Sky Water Tank Cleaning & Maintenance Services',
  represented_by: 'Authorised Signatory',
};

// ═══ PROVIDER MASTER AGREEMENT ══════════════════════════════════════════════
function buildProviderMasterAgreement({ provider = {}, capabilities = [], org = ORG, overrides = {} }) {
  const bd = provider.bank_details || {};
  const catNames = capabilities.map((c) => c.category?.name || c.name).filter(Boolean);
  const terms = {
    agreement_type: 'provider_master_agreement',
    commission_pct: Number(overrides.commission_pct ?? 20),
    fee_basis: overrides.fee_basis || 'Seventh Sky retains its fee from client charges; the balance is disbursed to the Service Provider per Work Order milestones.',
    term_months: Number(overrides.term_months ?? 12),
    renewal: overrides.renewal || 'Renews for successive 12-month terms unless terminated.',
    payment_terms: overrides.payment_terms || 'Within 7 business days of verified completion / milestone.',
    service_categories: catNames,
    districts: provider.districts || [],
    cities: provider.cities || [],
    cumilla_restricted: !!provider.cumilla_restricted,
    exclusive_territory: !!provider.exclusive_territory,
    non_circumvention: true,
    protected_client_months: Number(overrides.protected_client_months ?? 24),
  };

  const body = `
    <p style="font-size:13px;">This Service Delivery Provider Master Agreement is made between:</p>
    ${table(
      row('Seventh Sky (Principal)', `${org.name} — ${org.division}`) +
      row('Service Provider', or(provider.company_name)) +
      row('Trade Licence No', or(provider.trade_licence_no)) +
      row('Company Registration No', or(provider.company_reg_no)) +
      row('TIN', or(provider.tin)) +
      row('BIN', or(provider.bin)) +
      row('Registered Address', or(provider.address)) +
      row('Represented By', or(provider.contact_person)) +
      row('Phone / Email', `${or(provider.phone)} · ${or(provider.email)}`)
    )}

    ${section(1, 'Appointment', `Seventh Sky appoints the Service Provider as a non-exclusive independent contractor to deliver the services within the Service Categories set out below, on a Work Order basis. The Service Provider is an independent contractor and not an employee or agent of Seventh Sky.`)}

    ${section(2, 'Term & Renewal', `This Agreement takes effect on the date of signing and continues for <b>${terms.term_months} months</b>. ${terms.renewal}`)}

    ${section(3, 'Service Categories', catNames.length
      ? `The Service Provider is engaged to deliver:${bullets(catNames)}`
      : 'The Service Provider is engaged to deliver the service categories agreed during onboarding and recorded in its capability matrix.')}

    ${section(4, 'Service Delivery Model', `Seventh Sky provides client acquisition, coordination, administration, quality oversight and reporting. The Service Provider provides the technical delivery (cleaning, disinfection, inspection, maintenance, repairs, water-quality and AMC services) to the standards required. Each engagement is authorised by a <b>Work Order</b>.`)}

    ${section(5, 'Commercial Principles & Fees', `Client charges are collected by Seventh Sky. ${terms.fee_basis} Seventh Sky's fee is <b>${terms.commission_pct}%</b> of the service value (or as stated per Work Order).`)}

    ${section(6, 'Payment of the Service Provider', `Seventh Sky pays the Service Provider into the nominated account, ${terms.payment_terms} Nominated account: ${or(bd.bank_name)}${bd.account_number ? ' · A/C ' + bd.account_number : ''}${bd.bkash ? ' · bKash ' + bd.bkash : ''}. Payments follow the milestones stated in each Work Order (project deposit/progress/completion, AMC schedule, or emergency fee).`)}

    ${section(7, 'Compliance, Licensing & Insurance', `The Service Provider warrants that its trade licence, registrations and insurances (public liability, workers compensation, contractor insurance as applicable) are valid and current for the term, and shall provide evidence on request.`)}

    ${section(8, 'Quality, Safety & Warranties', `The Service Provider shall perform all services safely, hygienically and to professional standards, and shall rectify defects within the warranty period at its own cost.`)}

    ${section(9, 'Exclusive Territory & Referrals', terms.cumilla_restricted
      ? `The Cumilla District is a protected/exclusive territory of Seventh Sky. The Service Provider shall refer all Cumilla enquiries to Seventh Sky and shall not solicit or service Cumilla clients directly.`
      : `The Service Provider shall refer to Seventh Sky any enquiries arising from Seventh Sky's clients or introductions.`)}

    ${section(10, 'Non-Circumvention & Client Protection', `The Service Provider shall not, for <b>${terms.protected_client_months} months</b> after introduction, directly or indirectly solicit, contract with, or provide services to any Seventh Sky client, or circumvent Seventh Sky in respect of any client, project or opportunity introduced by Seventh Sky.`)}

    ${section(11, 'Confidentiality & Data Protection', `Each party shall keep confidential the other's client information, pricing and business information, and comply with applicable data-protection obligations.`)}

    ${section(12, 'Suspension & Termination', `Seventh Sky may suspend or withhold Work Orders, and either party may terminate on material breach or on notice as provided in Seventh Sky's provider policy. Client-protection and non-circumvention obligations survive termination.`)}

    <p style="margin-top:16px;font-size:13px;">By signing below, the parties agree to be bound by this Agreement and Seventh Sky's provider policies as amended from time to time.</p>
    ${signBlock('For the Service Provider', 'For Seventh Sky Property Care')}
  `;
  return {
    title: `Service Delivery Provider Master Agreement — ${provider.company_name || ''}`.trim(),
    html: shell('Service Delivery Provider Master Agreement', 'Document No: SSPC-WTCM-SDPMA', body),
    terms,
  };
}

// ═══ CUSTOMER SERVICE AGREEMENT (used by client-side, Phase 6) ══════════════
function buildCustomerServiceAgreement({ client = {}, service = {}, quote = {}, org = ORG, overrides = {} }) {
  const terms = {
    agreement_type: 'customer_service_agreement',
    service_name: service.name || overrides.service_name || '',
    price: Number(overrides.price ?? quote.price ?? service.base_price ?? 0),
    deposit: Number(overrides.deposit ?? 0),
    warranty_months: Number(overrides.warranty_months ?? 0),
    site_address: overrides.site_address || client.address || '',
  };
  const body = `
    <p>This Customer Service Agreement is made between Seventh Sky Property Care and the Client below.</p>
    ${table(
      row('Client', or(client.full_name || client.name)) +
      row('Contact', `${or(client.mobile || client.phone)} · ${or(client.email)}`) +
      row('Service', or(terms.service_name)) +
      row('Site Address', or(terms.site_address)) +
      row('Price', terms.price ? money(terms.price) : 'Per approved quotation') +
      row('Warranty', terms.warranty_months ? `${terms.warranty_months} months` : 'As per service')
    )}
    ${section(1, 'Scope', `Seventh Sky will coordinate and deliver the agreed service through its approved providers or internal team, to professional standards.`)}
    ${section(2, 'Charges & Payment', `The Client agrees to pay the charges above${terms.deposit ? `, including a deposit of ${money(terms.deposit)}` : ''}. Payment is made to Seventh Sky.`)}
    ${section(3, 'Warranty & Complaints', `Defects reported within the warranty period will be rectified. Complaints are handled under Seventh Sky's complaint procedure.`)}
    ${signBlock('For the Client', 'For Seventh Sky Property Care')}
  `;
  return { title: `Customer Service Agreement — ${terms.service_name || client.full_name || ''}`.trim(), html: shell('Customer Service Agreement', 'Document No: SSPC-WTCM-CSA', body), terms };
}

// ═══ PROJECT WORK ORDER (used by Phase 4) ═══════════════════════════════════
function buildServiceWorkOrder({ workOrder = {}, provider = {}, service = {}, client = {}, overrides = {} }) {
  const terms = {
    agreement_type: 'service_work_order',
    work_order_code: workOrder.work_order_code || overrides.work_order_code || '',
    service_name: service.name || workOrder.title || '',
    scope: overrides.scope || workOrder.scope || '',
    provider_charge: Number(overrides.provider_charge ?? 0),
    sspc_fee: Number(overrides.sspc_fee ?? 0),
  };
  const body = `
    ${table(
      row('Work Order No', or(terms.work_order_code)) +
      row('Client', or(client.full_name || client.name)) +
      row('Site Address', or(overrides.site_address || client.address)) +
      row('Service Category', or(terms.service_name)) +
      row('Assigned Provider', or(provider.company_name)) +
      row('Scope of Work', or(terms.scope)) +
      row('Provider Charge', terms.provider_charge ? money(terms.provider_charge) : '__________') +
      row('Seventh Sky Fee', terms.sspc_fee ? money(terms.sspc_fee) : '__________')
    )}
    ${section(1, 'Authorisation', 'Seventh Sky authorises the assigned Service Provider to perform the scope of work above under the Provider Master Agreement.')}
    ${signBlock('Seventh Sky (Issued by)', 'Service Provider (Accepted by)')}
  `;
  return { title: `Work Order — ${terms.work_order_code || terms.service_name}`.trim(), html: shell('Project Work Order', 'Document No: SSPC-WTCM-WO', body), terms };
}

module.exports = { buildProviderMasterAgreement, buildCustomerServiceAgreement, buildServiceWorkOrder };
