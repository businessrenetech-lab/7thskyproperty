/**
 * kycRequirements.service.js — the role-based KYC requirement schema.
 * Drives the "missing documents" checklist on the intake page and the
 * kyc-verified gate. Property-care CUSTOMERS need no KYC.
 */

// document_type keys are stable; label is shown to the signer.
const D = (document_type, label, opts = {}) => ({
  document_type, label,
  required: opts.required !== false,
  front_back: !!opts.front_back,
  expiry: !!opts.expiry,
  reference: !!opts.reference,
});

const REQUIREMENTS = {
  tenant: [
    D('nid_passport', 'NID / Passport', { front_back: true, reference: true }),
    D('photo', 'Photo / selfie', { required: false }),
    D('address_proof', 'Current address proof'),
    D('employment_proof', 'Employment proof'),
    D('income_bank_statement', 'Income / bank statement'),
    D('emergency_contact', 'Emergency contact document', { required: false }),
    D('references', 'References', { required: false }),
    D('current_tenancy_info', 'Current tenancy info', { required: false }),
  ],
  landlord: [
    D('nid_passport', 'NID / Passport', { front_back: true, reference: true }),
    D('ownership_document', 'Ownership document', { expiry: false }),
    D('property_proof', 'Utility bill / property proof'),
    D('bank_details', 'Bank / payment details', { reference: true }),
    D('poa_document', 'POA / local representative document', { required: false }),
    D('joint_owner_consent', 'Joint owner consent', { required: false }),
  ],
  buyer: [
    D('nid_passport', 'NID / Passport', { front_back: true, reference: true }),
    D('proof_of_funds', 'Proof of funds'),
    D('bank_details', 'Bank details', { reference: true }),
    D('address_proof', 'Address proof'),
    D('source_of_funds', 'Source of funds declaration'),
  ],
  vendor: [
    D('nid_passport', 'NID / Passport', { front_back: true, reference: true }),
    D('ownership_deed', 'Ownership / deed document'),
    D('mutation_tax_holding', 'Mutation / tax / holding documents'),
    D('bank_details', 'Bank details', { reference: true }),
    D('poa_document', 'POA (if representative)', { required: false }),
  ],
  provider: [
    D('nid_company_reg', 'NID / Company registration', { reference: true }),
    D('trade_licence', 'Trade licence', { expiry: true, reference: true }),
    D('tin', 'TIN', { reference: true }),
    D('bin', 'BIN', { required: false, reference: true }),
    D('insurance', 'Insurance', { expiry: true }),
    D('certifications', 'Certifications', { required: false, expiry: true }),
    // Account details are captured (typed) on the agreement itself, so the bank
    // KYC document is optional here to avoid asking twice.
    D('bank_details', 'Bank / payment details (optional — provided on agreement)', { required: false, reference: true }),
    D('capability_documents', 'Service capability documents', { required: false }),
    D('coverage_proof', 'Coverage area proof', { required: false }),
  ],
  // Property-care service customers: NO KYC.
  customer: [],
  care_customer: [],
  witness: [],
};

/**
 * Document scopes — who a verified document belongs to, and therefore when it
 * can be reused instead of asking the person again:
 *   identity — proves who the CONTACT is. Verified once, valid for every role
 *              and every property.
 *   role     — proves fitness for a ROLE. Verified once per role, reused across
 *              properties for that same role.
 *   property — tied to ONE property (deeds, ownership, consents). Never reused.
 * Unlisted types default to 'role' (safe: reused only within the same role).
 */
const DOC_SCOPES = {
  nid_passport: 'identity',
  photo: 'identity',
  address_proof: 'identity',
  nid_company_reg: 'identity',
  tin: 'identity',
  proof_of_funds: 'role',
  source_of_funds: 'role',
  bank_details: 'role',
  employment_proof: 'role',
  income_bank_statement: 'role',
  references: 'role',
  emergency_contact: 'role',
  trade_licence: 'role',
  bin: 'role',
  insurance: 'role',
  certifications: 'role',
  capability_documents: 'role',
  coverage_proof: 'role',
  ownership_deed: 'property',
  ownership_document: 'property',
  mutation_tax_holding: 'property',
  property_proof: 'property',
  poa_document: 'property',
  joint_owner_consent: 'property',
  current_tenancy_info: 'property',
};

function docScope(documentType) {
  return DOC_SCOPES[documentType] || 'role';
}

function requirementsFor(role) {
  return REQUIREMENTS[role] || [];
}

// Compare uploaded docs against the requirement schema → checklist + status.
function evaluate(role, uploaded = []) {
  const reqs = requirementsFor(role);
  const byType = uploaded.reduce((a, d) => { (a[d.document_type] = a[d.document_type] || []).push(d); return a; }, {});
  const items = reqs.map((r) => {
    const docs = byType[r.document_type] || [];
    const latest = docs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0] || null;
    const status = latest ? latest.status : 'missing';
    return { ...r, status, uploaded: !!latest, document_id: latest?.id || null, verified: status === 'verified' };
  });
  const requiredItems = items.filter((i) => i.required);
  const allSubmitted = requiredItems.every((i) => i.uploaded);
  const allVerified = requiredItems.every((i) => i.verified);
  const anyRejected = items.some((i) => i.status === 'rejected' || i.status === 'needs_resubmission');
  const kyc_status = reqs.length === 0 ? 'not_required'
    : allVerified ? 'kyc_verified'
    : anyRejected ? 'needs_resubmission'
    : allSubmitted ? 'kyc_submitted'
    : 'kyc_pending';
  return { items, kyc_status, all_submitted: allSubmitted, all_verified: allVerified, required_count: requiredItems.length, verified_count: requiredItems.filter((i) => i.verified).length };
}

module.exports = { REQUIREMENTS, DOC_SCOPES, docScope, requirementsFor, evaluate };
