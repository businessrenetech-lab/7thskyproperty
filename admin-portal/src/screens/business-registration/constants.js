// Shared taxonomy for the Business Registration console (SSPC-BR-SOP-01).

// Project pipeline stages — the 9-phase SOP collapsed into the delivery pipeline.
export const STAGES = [
  { key: 'consultation', label: 'Consultation', phase: 'Phase 2' },
  { key: 'quotation', label: 'Quotation', phase: 'Phase 3' },
  { key: 'agreement', label: 'Agreement & Deposit', phase: 'Phase 3' },
  { key: 'documents', label: 'Document Collection', phase: 'Phase 4' },
  { key: 'provider', label: 'Provider Assignment', phase: 'Phase 5' },
  { key: 'registration', label: 'Registration In Progress', phase: 'Phase 6' },
  { key: 'qa', label: 'Quality Review', phase: 'Phase 7' },
  { key: 'completion', label: 'Completion', phase: 'Phase 8–9' },
  { key: 'closed', label: 'Closed', phase: '' },
];
export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.key, s.label]));
export const STAGE_KEYS = STAGES.map((s) => s.key);

export const STATUSES = [
  { key: 'active', label: 'Active', tone: 'green' },
  { key: 'on_hold', label: 'On Hold', tone: 'amber' },
  { key: 'completed', label: 'Completed', tone: 'blue' },
  { key: 'cancelled', label: 'Cancelled', tone: 'red' },
];
export const STATUS_TONE = Object.fromEntries(STATUSES.map((s) => [s.key, s.tone]));

export const BIZ_TYPES = [
  ['sole_proprietorship', 'Sole Proprietorship'],
  ['partnership', 'Partnership'],
  ['private_limited', 'Private Limited Company'],
  ['public_limited', 'Public Limited Company'],
  ['business_name', 'Business Name'],
  ['rjsc', 'RJSC Registration'],
  ['trade_licence', 'Trade Licence Only'],
  ['other', 'Other'],
];
export const BIZ_TYPE_LABEL = Object.fromEntries(BIZ_TYPES.map(([k, v]) => [k, v]));

export const URGENCY = [
  ['normal', 'Normal'],
  ['urgent', 'Urgent'],
  ['priority', 'Priority'],
];
export const URGENCY_TONE = { normal: 'grey', urgent: 'amber', priority: 'red' };

export const LEAD_SOURCES = [
  ['website', 'Website'], ['social', 'Social Media'], ['whatsapp', 'WhatsApp'],
  ['referral', 'Referral'], ['walk_in', 'Walk-In'], ['existing_client', 'Existing Client'],
];

export const CLIENT_TYPES = [['individual', 'Individual'], ['business', 'Business']];

export const ENQUIRY_STAGES = [
  ['new', 'New'], ['qualified', 'Qualified'], ['consultation', 'Consultation'],
  ['converted', 'Converted'], ['lost', 'Lost'],
];
export const ENQUIRY_STAGE_TONE = { new: 'blue', qualified: 'violet', consultation: 'amber', converted: 'green', lost: 'red' };

// Schedule A — the selectable services (mirrors registration_business schedule config).
export const SERVICE_GROUPS = [
  ['Trade Licence Services', ['New Trade Licence Application', 'Trade Licence Renewal', 'Trade Licence Amendment', 'Municipality Documentation', 'City Corporation Documentation', 'Local Authority Coordination']],
  ['Business Registration Services', ['Sole Proprietorship Registration', 'Partnership Registration', 'Private Limited Company Registration', 'Public Limited Company Registration', 'Business Name Registration', 'RJSC Registration Coordination']],
  ['Corporate Documentation', ['Memorandum of Association Coordination', 'Articles of Association Coordination', 'Shareholder Documentation', 'Director Documentation', 'Company Resolution Preparation', 'Statutory Documentation']],
  ['Tax & Regulatory Registration', ['TIN Registration Coordination', 'BIN Registration Coordination', 'VAT Registration Coordination', 'Tax Registration Support', 'Regulatory Compliance Documentation']],
  ['Corporate Compliance Services', ['Annual Return Coordination', 'Company Information Update', 'Regulatory Filing Support', 'Corporate Record Maintenance', 'Company Secretarial Coordination']],
  ['Business Advisory Services', ['Business Structure Consultation', 'Registration Process Guidance', 'Documentation Review', 'Regulatory Compliance Advice']],
  ['Additional Services', ['Government Authority Liaison', 'Certified Document Coordination', 'Translation Coordination', 'Business Information Update']],
];

export const money = (n) => `৳${Number(n || 0).toLocaleString()}`;
