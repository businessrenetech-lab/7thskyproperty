// Business Confidentiality Agreement (NDA) — drafted from the Business Sale SOP
// §12 (non-circumvention) and §14 (confidentiality) and Business Purchase SOP
// §11/§13. LEGAL REVIEW REQUIRED before live use. Sign anchors match
// buildSignerDefs labels ('Client', 'Seventh Sky').
const { esc, signSlot } = require('./salesAgreementRender');

const CLAUSES = [
  ['Purpose', 'Seventh Sky Property Care ("Seventh Sky") will disclose confidential information about the business identified below (the "Business") so the Recipient can evaluate a possible acquisition. This Agreement governs that information.'],
  ['Confidential Information', 'Confidential Information includes the identity of the Business and its owners, its location, financial records, customer, supplier and employee information, operational strategies, lease and licence details, and any information marked or reasonably understood to be confidential.'],
  ['Use and non-disclosure', 'The Recipient will use the Confidential Information only to evaluate the acquisition, will not disclose it to anyone except professional advisers who are bound by equivalent confidentiality, and will not copy it except as reasonably necessary for that evaluation.'],
  ['No direct approach (non-circumvention)', 'For 24 months from signing, the Recipient will not contact the owners, employees, landlord, customers or suppliers of the Business about its sale or acquisition except through Seventh Sky, and will not complete any acquisition of the Business, directly or indirectly, without Seventh Sky. If the Recipient does so, the professional fee Seventh Sky would have earned remains payable.'],
  ['Return of information', 'On request, or if the Recipient decides not to proceed, the Recipient will return or destroy the Confidential Information and confirm this in writing.'],
  ['No warranty', 'Seventh Sky and the owners make no representation about the accuracy or completeness of the Confidential Information. The Recipient remains responsible for its own independent legal, accounting, financial, taxation and operational review.'],
  ['Evidence', 'The Recipient agrees that CRM records, e-mails, WhatsApp messages, inspection logs and digital approvals kept by Seventh Sky may be relied on as evidence of introductions and communications.'],
  ['Term and law', 'The confidentiality obligations survive for 3 years after signing. This Agreement is governed by the laws of the People\'s Republic of Bangladesh.'],
];

function renderNdaHtml({ buyer = {}, property = {}, org = {}, effectiveDate }) {
  const ref = property.property_code || `#${property.id}`;
  return `
<div class="sales-doc" style="font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#1e293b;max-width:760px;margin:0 auto;padding:32px 40px;line-height:1.6;font-size:13.5px;">
  <div style="font-size:11px;font-weight:700;color:#00AEEF;letter-spacing:1px;text-transform:uppercase;">Seventh Sky Property Care · Business Services</div>
  <h1 style="font-size:24px;color:#012a4e;margin:6px 0 4px;">Business Confidentiality Agreement</h1>
  <div style="font-size:12px;color:#64748b;margin-bottom:18px;">Listing ${esc(ref)} · Effective ${esc(effectiveDate)}</div>
  <p><b>Between</b> ${esc(org.name || 'Seventh Sky Private Limited (Seventh Sky Property Care)')} and <b>${esc(buyer.full_name)}</b>${buyer.company ? ` of ${esc(buyer.company)}` : ''} (the "Recipient"), email ${esc(buyer.email)}.</p>
  <p><b>Business:</b> the business marketed by Seventh Sky under listing reference ${esc(ref)}.</p>
  ${CLAUSES.map(([t, b], i) => `<h2 style="font-size:14px;color:#012a4e;margin:16px 0 4px;">${i + 1}. ${esc(t)}</h2><p style="margin:0;">${esc(b)}</p>`).join('')}
  <div id="signatures-section" style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:28px;">
    <div style="border:1px solid #cbd5e1;border-radius:12px;padding:14px;"><div style="font-weight:800;color:#012a4e;">Recipient</div><div>${esc(buyer.full_name)}</div>${signSlot('Client')}</div>
    <div style="border:1px solid #cbd5e1;border-radius:12px;padding:14px;"><div style="font-weight:800;color:#012a4e;">Seventh Sky</div><div>${esc(org.represented_by || 'Authorised signatory')}</div>${signSlot('Seventh Sky')}</div>
  </div>
</div>`;
}

module.exports = { renderNdaHtml, NDA_CLAUSES: CLAUSES };
