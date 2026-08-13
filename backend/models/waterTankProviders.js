/**
 * waterTankProviders.js — models for SSPC-WTCM-SOP-02
 * (Water Tank Cleaning & Maintenance · Third-Party Service Provider Management).
 * Tables created by migration 0068-water-tank-provider-sop.
 */
const { DataTypes: D } = require('sequelize');
const sequelize = require('../config/db.config');

const base = {
  id: { type: D.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: D.INTEGER, allowNull: false, defaultValue: 1 },
};

/* Sec. 5 Step 2 (compliance) + Step 3 (insurance) registers. */
const WtProviderDocument = sequelize.define('WtProviderDocument', {
  ...base,
  provider_id: { type: D.INTEGER, allowNull: false },
  category: { type: D.STRING(20), allowNull: false, defaultValue: 'compliance' },
  doc_type: { type: D.STRING(80), allowNull: false },
  doc_number: D.STRING(120),
  issuer: D.STRING(160),
  sum_insured: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  issue_date: D.DATEONLY,
  expiry_date: D.DATEONLY,
  file_url: D.STRING(500),
  verified: { type: D.BOOLEAN, defaultValue: false },
  verified_by: D.STRING(120),
  verified_date: D.DATEONLY,
  status: { type: D.STRING(30), defaultValue: 'Pending' },
  notes: D.TEXT,
}, { tableName: 'wt_provider_documents' });

/* Sec. 14 Provider audits. */
const WtProviderAudit = sequelize.define('WtProviderAudit', {
  ...base,
  code: { type: D.STRING(30), allowNull: false, unique: true },
  provider_id: { type: D.INTEGER, allowNull: false },
  provider_name: D.STRING(200),
  audit_type: { type: D.STRING(60), allowNull: false },
  scheduled_date: D.DATEONLY,
  conducted_date: D.DATEONLY,
  auditor: D.STRING(120),
  score: { type: D.INTEGER, defaultValue: 0 },
  outcome: { type: D.STRING(40), defaultValue: 'Scheduled' },
  findings: D.TEXT,
  corrective_actions: D.TEXT,
  action_due_date: D.DATEONLY,
  closed: { type: D.BOOLEAN, defaultValue: false },
  next_due_date: D.DATEONLY,
  checklist: D.JSON,
}, { tableName: 'wt_provider_audits' });

/* Lifecycle timeline — one row per stage change, briefing, audit, sanction. */
const WtProviderEvent = sequelize.define('WtProviderEvent', {
  ...base,
  provider_id: { type: D.INTEGER, allowNull: false },
  event_type: { type: D.STRING(60), allowNull: false },
  title: { type: D.STRING(200), allowNull: false },
  detail: D.TEXT,
  actor: D.STRING(120),
  occurred_at: { type: D.DATE, allowNull: false, defaultValue: D.NOW },
}, { tableName: 'wt_provider_events' });

/* Sec. 12 Protected clients — 24-month non-circumvention protection. */
const WtProtectedClient = sequelize.define('WtProtectedClient', {
  ...base,
  code: { type: D.STRING(30), allowNull: false, unique: true },
  client_name: { type: D.STRING(200), allowNull: false },
  provider_id: D.INTEGER,
  provider_name: D.STRING(200),
  project_id: D.STRING(30),
  work_order_code: D.STRING(30),
  trigger_event: { type: D.STRING(60), defaultValue: 'Project Completion' },
  protection_start: D.DATEONLY,
  protection_end: D.DATEONLY,
  status: { type: D.STRING(30), defaultValue: 'Protected' },
  breach_notes: D.TEXT,
  breach_reported_date: D.DATEONLY,
}, { tableName: 'wt_protected_clients' });

/* Sec. 8 Step 10 Provider reporting. */
const WtServiceReport = sequelize.define('WtServiceReport', {
  ...base,
  code: { type: D.STRING(30), allowNull: false, unique: true },
  report_type: { type: D.STRING(60), allowNull: false },
  work_order_code: D.STRING(30),
  project_id: D.STRING(30),
  client_name: D.STRING(200),
  provider_id: D.INTEGER,
  provider_name: D.STRING(200),
  submitted_date: D.DATEONLY,
  summary: D.TEXT,
  findings: D.TEXT,
  data: D.JSON,
  photos_before: D.JSON,
  photos_after: D.JSON,
  status: { type: D.STRING(30), defaultValue: 'Submitted' },
  reviewed_by: D.STRING(120),
  reviewed_date: D.DATEONLY,
  review_notes: D.TEXT,
  /*
   * Resolved job context (migration 0088). Written server-side from the work
   * order rather than typed, so a report and the job it describes cannot
   * disagree. `filed_via` distinguishes a provider submitting through the portal
   * from a staff member logging it on their behalf — different things when a
   * dispute arrives.
   */
  work_order_id: D.INTEGER,
  client_code: D.STRING(30),
  site_address: D.STRING(255),
  service_category: D.STRING(120),
  filed_via: { type: D.STRING(20), defaultValue: 'staff' },
  filed_by: D.STRING(120),
}, { tableName: 'wt_service_reports' });

const WtProviderAgreement = sequelize.define('WtProviderAgreement', {
  ...base,
  code: { type: D.STRING(40), allowNull: false, unique: true },
  provider_id: { type: D.INTEGER, allowNull: false },
  envelope_id: D.INTEGER,
  version_no: { type: D.INTEGER, allowNull: false, defaultValue: 1 },
  supersedes_id: D.INTEGER,
  status: { type: D.STRING(30), allowNull: false, defaultValue: 'Draft' },
  effective_date: D.DATEONLY,
  expiry_date: D.DATEONLY,
  term_months: { type: D.INTEGER, allowNull: false, defaultValue: 12 },
  notice_days: { type: D.INTEGER, allowNull: false, defaultValue: 30 },
  commission_pct: { type: D.DECIMAL(7, 3), allowNull: false, defaultValue: 0 },
  payment_model: { type: D.STRING(40), allowNull: false, defaultValue: 'Project Based' },
  payout_trigger: { type: D.STRING(50), allowNull: false, defaultValue: 'Completion Verified' },
  payment_due_days: { type: D.INTEGER, allowNull: false, defaultValue: 7 },
  payment_terms: D.TEXT,
  fee_notes: D.TEXT,
  bank_details: D.JSON,
  authorised_services: D.JSON,
  compliance_checklist: D.JSON,
  territory_terms: D.JSON,
  terms_snapshot: D.JSON,
  drafted_by: D.INTEGER,
  sent_at: D.DATE,
  completed_at: D.DATE,
}, { tableName: 'wt_provider_agreements', underscored: true });

const WtProviderAgreementRate = sequelize.define('WtProviderAgreementRate', {
  ...base,
  agreement_id: { type: D.INTEGER, allowNull: false },
  provider_id: { type: D.INTEGER, allowNull: false },
  service_item_id: D.INTEGER,
  service_code: { type: D.STRING(40), allowNull: false },
  service_name: { type: D.STRING(220), allowNull: false },
  rate_group: { type: D.STRING(30), allowNull: false, defaultValue: 'service' },
  unit: D.STRING(60),
  standard_rate: { type: D.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  proposed_rate: D.DECIMAL(15, 2),
  agreed_rate: { type: D.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  rate_status: { type: D.STRING(30), allowNull: false, defaultValue: 'Approved' },
  effective_from: D.DATEONLY,
  effective_to: D.DATEONLY,
  approved_by: D.INTEGER,
  approved_at: D.DATE,
}, { tableName: 'wt_provider_agreement_rates', underscored: true });

module.exports = {
  WtProviderDocument, WtProviderAudit, WtProviderEvent, WtProtectedClient,
  WtServiceReport, WtProviderAgreement, WtProviderAgreementRate,
};
