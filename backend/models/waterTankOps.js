/**
 * waterTankOps.js — Sequelize models for the Water Tank Services operations module.
 * Schema matches the Figma screens. Tables created by migration 0065-water-tank-ops.
 */
const { DataTypes: D } = require('sequelize');
const sequelize = require('../config/db.config');
const base = { id: { type: D.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: D.INTEGER, allowNull: false, defaultValue: 1 } };

const WtClient = sequelize.define('WtClient', {
  ...base,
  code: { type: D.STRING(30), allowNull: false, unique: true },
  name: { type: D.STRING(200), allowNull: false },
  client_type: { type: D.STRING(30), defaultValue: 'Residential' },
  mobile: D.STRING(40), email: D.STRING(160), district: D.STRING(80), property_type: D.STRING(80),
  current_status: { type: D.STRING(40), defaultValue: 'New Lead' },
  assigned_officer: D.STRING(120), service_address: D.STRING(255), lead_source: D.STRING(80),
  tanks_count: { type: D.INTEGER, defaultValue: 0 },
  tank_type: D.STRING(120), tank_capacity: D.STRING(120), key_issues: D.TEXT, last_cleaning: D.STRING(120),
  amc_package: D.STRING(120), amc_annual_value: { type: D.DECIMAL(15, 2), defaultValue: 0 }, amc_status: D.STRING(40),
  active_project_name: D.STRING(160), active_project_scope: D.TEXT, active_project_progress: { type: D.INTEGER, defaultValue: 0 },
  notes: D.TEXT,
  // ── SSPC-WTCM-SOP-01 (Client / End User Management) ──
  workflow_stage: { type: D.STRING(40), defaultValue: 'Lead Enquiry' }, stage_updated_at: D.DATE,
  // Sec. 5 Step 1 register client
  enquiry_date: D.DATEONLY, enquiry_channel: D.STRING(60),
  requested_service: D.STRING(200), service_category: D.STRING(80),
  alt_contact_name: D.STRING(120), alt_contact_phone: D.STRING(40),
  // Sec. 5 Step 2 initial consultation
  consultation_date: D.DATEONLY, consultation_by: D.STRING(120), consultation_notes: D.TEXT,
  water_quality_concerns: D.TEXT, amc_required: { type: D.BOOLEAN, defaultValue: false },
  // Sec. 7 Step 6 customer service agreement
  agreement_status: { type: D.STRING(40), defaultValue: 'Not Started' },
  agreement_code: D.STRING(40), agreement_envelope_id: D.INTEGER, agreement_signed_date: D.DATEONLY,
  // deposit collection
  deposit_required: { type: D.BOOLEAN, defaultValue: false },
  deposit_amount: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  deposit_paid_amount: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  deposit_date: D.DATEONLY,
  // Sec. 9 Step 10 client handover
  handover_date: D.DATEONLY, handover_docs: D.JSON, maintenance_recommendations: D.TEXT,
  // Sec. 12 project closure
  final_payment_confirmed: { type: D.BOOLEAN, defaultValue: false },
  satisfaction_score: { type: D.DECIMAL(3, 1), defaultValue: 0 },
  satisfaction_date: D.DATEONLY, satisfaction_notes: D.TEXT,
  closure_checklist: D.JSON, closed_date: D.DATEONLY,
  archived: { type: D.BOOLEAN, defaultValue: false },
  // service history / Sec. 13 KPI support
  first_service_date: D.DATEONLY, last_service_date: D.DATEONLY,
  converted: { type: D.BOOLEAN, defaultValue: false }, converted_date: D.DATEONLY,
  // Portal access (0084)
  portal_token_hash: D.STRING(128), portal_token_expires_at: D.DATE,
  portal_last_seen_at: D.DATE, portal_revoked_at: D.DATE,
  portal_user_id: D.INTEGER,
}, { tableName: 'wt_clients' });

const WtServiceRequest = sequelize.define('WtServiceRequest', {
  ...base,
  code: { type: D.STRING(30), allowNull: false, unique: true },
  request_date: D.DATEONLY,
  client_name: { type: D.STRING(200), allowNull: false },
  category: D.STRING(120), specific_service: D.STRING(160),
  priority: { type: D.STRING(20), defaultValue: 'Medium' },
  preferred_date: D.DATEONLY,
  visit_required: { type: D.BOOLEAN, defaultValue: false },
  deposit_required: { type: D.BOOLEAN, defaultValue: false },
  provider_name: D.STRING(160),
  status: { type: D.STRING(40), defaultValue: 'New' },
  assigned_officer: D.STRING(120), address: D.STRING(255), description: D.TEXT,
  // client + contact carried from the enquiry
  client_code: D.STRING(30), email: D.STRING(160), phone: D.STRING(40),
  district: D.STRING(80), property_type: D.STRING(80), services_requested: D.JSON,
  // the routing decision: assessment first, or straight to a quotation
  needs_assessment: { type: D.BOOLEAN, defaultValue: true },
  assessment_date: D.DATEONLY, assessment_code: D.STRING(30),
  quotation_code: D.STRING(30), project_id: D.STRING(30),
  source: { type: D.STRING(60), defaultValue: 'Direct' }, enquiry_code: D.STRING(30),
}, { tableName: 'wt_service_requests' });

/* Website / phone / walk-in enquiries for water tank services. */
const WtEnquiry = sequelize.define('WtEnquiry', {
  ...base,
  code: { type: D.STRING(30), allowNull: false, unique: true },
  client_name: { type: D.STRING(200), allowNull: false },
  phone: { type: D.STRING(40), allowNull: false },
  email: D.STRING(160),
  site_address: D.STRING(255), district: D.STRING(80), property_type: D.STRING(80),
  services_requested: D.JSON, tank_type: D.STRING(120),
  tanks_count: { type: D.INTEGER, defaultValue: 0 },
  preferred_date: D.DATEONLY, message: D.TEXT,
  source: { type: D.STRING(60), defaultValue: 'Website' },
  page_url: D.STRING(500),
  status: { type: D.STRING(30), defaultValue: 'New' },
  assigned_officer: D.STRING(120), contacted_at: D.DATE, notes: D.TEXT,
  converted_request_code: D.STRING(30), converted_client_code: D.STRING(30),
  converted_at: D.DATE,
}, { tableName: 'wt_enquiries' });

const WtSiteAssessment = sequelize.define('WtSiteAssessment', {
  ...base,
  code: { type: D.STRING(30), allowNull: false, unique: true },
  project_id: D.STRING(30),
  client_name: { type: D.STRING(200), allowNull: false },
  provider: D.STRING(160), assessed_date: D.DATEONLY,
  access_safe: { type: D.BOOLEAN, defaultValue: true },
  contamination: D.STRING(120), leakage: D.STRING(120),
  photos_count: { type: D.INTEGER, defaultValue: 0 },
  status: { type: D.STRING(40), defaultValue: 'Scheduled' },
  checklist: D.JSON, findings: D.TEXT, photos: D.JSON,
  // Sec. 8 Step 8 — structured assessment: tank profile, risks, variations, sign-off
  tank_type: D.STRING(120), tank_capacity: D.STRING(120), tank_material: D.STRING(120),
  tank_location: D.STRING(120), last_cleaned: D.STRING(120), water_source: D.STRING(120),
  risks: D.JSON, variations: D.JSON,
  scope_confirmed: { type: D.BOOLEAN, defaultValue: false },
  recommended_services: D.JSON, water_test: D.JSON,
  structural_notes: D.TEXT, access_notes: D.TEXT,
  assessor: D.STRING(120), signed_off_by: D.STRING(120), signed_off_date: D.DATEONLY,
  photos_after: D.JSON,
  // assessor-added checklist items, visit context and client sign-off
  custom_checks: D.JSON, equipment: D.JSON,
  attendees: D.STRING(255), weather: D.STRING(80),
  duration_minutes: { type: D.INTEGER, defaultValue: 0 },
  client_present: { type: D.BOOLEAN, defaultValue: false },
  client_signature: D.STRING(500), template_key: D.STRING(60),
}, { tableName: 'wt_site_assessments' });

/* Running commentary against any water-tank record (assessment, quotation, ...). */
const WtRecordComment = sequelize.define('WtRecordComment', {
  ...base,
  entity_type: { type: D.STRING(40), allowNull: false },
  entity_id: { type: D.INTEGER, allowNull: false },
  entity_code: D.STRING(30),
  body: { type: D.TEXT, allowNull: false },
  category: { type: D.STRING(40), defaultValue: 'Note' },
  author: D.STRING(120),
  attachment_url: D.STRING(500),
  pinned: { type: D.BOOLEAN, defaultValue: false },
}, { tableName: 'wt_record_comments' });

const WtQuotation = sequelize.define('WtQuotation', {
  ...base,
  code: { type: D.STRING(30), allowNull: false, unique: true },
  project_id: D.STRING(30),
  client_name: { type: D.STRING(200), allowNull: false },
  lines: D.JSON,
  service_charges: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  provider_allocation_fee: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  vat: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  total: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  validity: D.STRING(40),
  decision: { type: D.STRING(30), defaultValue: 'Pending' },
  // quotation builder (Sec. 7 Step 5)
  source_assessment: D.STRING(30),
  other_fees: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  discount: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  vat_exempt: { type: D.BOOLEAN, defaultValue: false },
  payment_terms: D.TEXT, notes: D.TEXT,
  // structured advance (migration 0078) — free-text payment_terms cannot be
  // computed from, so the agreement could never reuse it
  advance_percent: { type: D.DECIMAL(5, 2), defaultValue: 0 },
  advance_amount: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  advance_basis: { type: D.STRING(20), defaultValue: 'percent' },
  agreement_envelope_id: D.INTEGER,
  // raised straight to quote, no assessment behind it (migration 0081)
  direct_quote: { type: D.BOOLEAN, defaultValue: false },
  client_code: D.STRING(30), site_address: D.STRING(255), work_order_code: D.STRING(30),
  sent_at: D.DATE, sent_to: D.STRING(160),
  agreement_envelope_id: D.INTEGER, agreement_code: D.STRING(40),
}, { tableName: 'wt_quotations' });

const WtWorkOrder = sequelize.define('WtWorkOrder', {
  ...base,
  code: { type: D.STRING(30), allowNull: false, unique: true },
  project_id: D.STRING(30),
  client_name: { type: D.STRING(200), allowNull: false },
  provider_name: D.STRING(160), category: D.STRING(120), target_date: D.DATEONLY,
  status: { type: D.STRING(30), defaultValue: 'Draft' },
  provider_fee: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  ss_fee: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  total_contract: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  scope: D.TEXT, special_conditions: D.TEXT, warranty: D.STRING(120),
  source_ref: D.STRING(80),
  // provider payout tracking (Payments & Disbursements)
  provider_paid_amount: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  payout_status: { type: D.STRING(30), defaultValue: 'Not Due' },
  payout_date: D.DATEONLY, payout_method: D.STRING(40), payout_reference: D.STRING(80),
  // ── delivery lifecycle (Sec. 8 Steps 7-10, Sec. 9 Step 9) ──
  source_quotation: D.STRING(30), source_agreement: D.STRING(40),
  agreement_envelope_id: D.INTEGER, source_request: D.STRING(30),
  client_code: D.STRING(30), site_address: D.STRING(255), client_phone: D.STRING(40),
  provider_id: D.INTEGER, assigned_at: D.DATE, assigned_by: D.STRING(120),
  accepted_at: D.DATE, accepted_by: D.STRING(120), declined_reason: D.TEXT,
  scheduled_date: D.DATEONLY, started_at: D.DATE, completed_at: D.DATE,
  crew_size: { type: D.INTEGER, defaultValue: 0 }, attendance: D.JSON,
  stages: D.JSON, progress: { type: D.INTEGER, defaultValue: 0 },
  site_cleaned: { type: D.BOOLEAN, defaultValue: false },
  reports_submitted: { type: D.BOOLEAN, defaultValue: false },
  photos_collected: { type: D.BOOLEAN, defaultValue: false },
  client_satisfied: { type: D.BOOLEAN, defaultValue: false },
  verified_by: D.STRING(120), verified_at: D.DATE, completion_notes: D.TEXT,
  lines: D.JSON,
  provider_agreement_id: D.INTEGER,
  provider_rate_snapshot: D.JSON,
  provider_gross_charge: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  provider_commission_pct: { type: D.DECIMAL(7, 3), defaultValue: 0 },
  provider_commission_amount: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  provider_net_payable: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  fee_override_reason: D.TEXT,
  fee_override_by: D.STRING(120),
  // SSPC-WTCM-PWO-01 — the ten sections of the signed Project Work Order
  quotation_no: D.STRING(40), agreement_reference: D.STRING(60),
  date_issued: D.DATEONLY, project_manager: D.STRING(120),
  client_company: D.STRING(160), client_contact_person: D.STRING(120),
  client_phone: D.STRING(40), client_email: D.STRING(160),
  site_address: D.TEXT, property_type: D.STRING(60),
  service_selections: D.JSON, tank_details: D.JSON, deliverables: D.TEXT,
  materials_required: D.JSON, chemicals_required: D.JSON, equipment_required: D.JSON,
  timeline_dates: D.JSON,
  material_lines: D.JSON, labour_lines: D.JSON, cost_summary: D.JSON,
  payment_schedule: D.JSON, payment_method: D.STRING(60), pricing_notes: D.TEXT,
  warranty_terms: D.JSON, project_checklist: D.JSON,
  wo_doc_code: D.STRING(40), wo_envelope_id: D.INTEGER,
  wo_doc_status: { type: D.STRING(30), defaultValue: 'Not Started' },
  wo_sent_at: D.DATE, wo_signed_at: D.DATE, wo_signed_document_html: D.TEXT('long'),
  // Clause 9 AMC billing cycle + the quotation this order came from (migration 0081)
  amc_payment_frequency: D.STRING(30), source_quotation_code: D.STRING(30),
  provider_onboarded_at: D.DATE, client_notified_at: D.DATE,
}, { tableName: 'wt_work_orders' });

const WtProject = sequelize.define('WtProject', {
  ...base,
  code: { type: D.STRING(30), allowNull: false, unique: true },
  name: { type: D.STRING(200), allowNull: false },
  client_name: D.STRING(200), assigned_provider: D.STRING(160),
  start_date: D.DATEONLY, target_completion: D.DATEONLY,
  health_index: { type: D.STRING(40), defaultValue: 'Normal/Clear' },
  stage: { type: D.STRING(60), defaultValue: 'Lead Enquiry' },
  status: { type: D.STRING(30), defaultValue: 'Open' },
  timeline: D.JSON, linked: D.JSON, milestones: D.JSON,
  // ── SSPC-WTCM-SOP-01: the project as the spine of the file (migration 0077) ──
  // who
  client_code: D.STRING(30), client_id: D.INTEGER,
  client_type: { type: D.STRING(30), defaultValue: 'Residential' },
  client_phone: D.STRING(40), client_email: D.STRING(160),
  agreement_code: D.STRING(40), agreement_envelope_id: D.INTEGER,
  agreement_status: { type: D.STRING(30), defaultValue: 'Not Started' },
  agreement_signed_at: D.DATE,
  // where
  property_id: D.INTEGER, property_code: D.STRING(40), property_title: D.STRING(200),
  property_type: D.STRING(80), site_address: D.STRING(255),
  area: D.STRING(120), city: D.STRING(80), district: D.STRING(80),
  site_contact_name: D.STRING(120), site_contact_phone: D.STRING(40), access_notes: D.TEXT,
  // what
  project_type: { type: D.STRING(60), defaultValue: 'Cleaning & Maintenance' },
  service_category: D.STRING(80), services: D.JSON,
  tank_type: D.STRING(120), tanks_count: { type: D.INTEGER, defaultValue: 0 },
  tank_capacity: D.STRING(120), water_source: D.STRING(120), scope_summary: D.TEXT,
  priority: { type: D.STRING(20), defaultValue: 'Medium' },
  // upstream chain
  origin: { type: D.STRING(40), defaultValue: 'Direct' },
  enquiry_code: D.STRING(30), request_code: D.STRING(30), assessment_code: D.STRING(30),
  quotation_code: D.STRING(30), work_order_code: D.STRING(30),
  needs_assessment: { type: D.BOOLEAN, defaultValue: false },
  needs_quotation: { type: D.BOOLEAN, defaultValue: false },
  // AMC (Sec. 10)
  under_amc: { type: D.BOOLEAN, defaultValue: false },
  amc_code: D.STRING(30), amc_package: D.STRING(120), amc_frequency: D.STRING(40),
  amc_visit_no: D.INTEGER, amc_next_visit: D.DATEONLY,
  // delivery (Sec. 8)
  provider_code: D.STRING(30), provider_id: D.INTEGER,
  assigned_officer: D.STRING(120), ops_manager: D.STRING(120),
  scheduled_date: D.DATEONLY, actual_start: D.DATEONLY, actual_completion: D.DATEONLY,
  progress_pct: { type: D.INTEGER, defaultValue: 0 }, duration_days: D.INTEGER,
  // commercials
  contract_value: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  provider_cost: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  deposit_required: { type: D.BOOLEAN, defaultValue: false },
  deposit_amount: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  deposit_received_at: D.DATEONLY, payment_terms: D.STRING(200),
  // closure (Sec. 9, Sec. 12)
  handover_at: D.DATEONLY, warranty_code: D.STRING(30), warranty_period: D.STRING(60),
  satisfaction_score: D.INTEGER, closure_checklist: D.JSON, risk_flags: D.JSON,
  closed_at: D.DATE, archived_at: D.DATE, cancel_reason: D.TEXT, notes: D.TEXT,
}, { tableName: 'wt_projects' });

/* Money paid OUT on a project. Provider payouts live on wt_work_orders and are
   read from there — this register is everything else (materials, transport, lab
   testing, government fees, reimbursements). */
const WtProjectDisbursement = sequelize.define('WtProjectDisbursement', {
  ...base,
  code: { type: D.STRING(30), allowNull: false, unique: true },
  project_code: { type: D.STRING(30), allowNull: false },
  category: { type: D.STRING(60), allowNull: false, defaultValue: 'Other' },
  payee: D.STRING(200), payee_type: { type: D.STRING(40), defaultValue: 'Supplier' },
  work_order_code: D.STRING(30), description: D.TEXT,
  amount: { type: D.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  status: { type: D.STRING(30), defaultValue: 'Requested' },
  incurred_on: D.DATEONLY, paid_on: D.DATEONLY,
  method: D.STRING(40), reference: D.STRING(80), receipt_url: D.STRING(500),
  billable_to_client: { type: D.BOOLEAN, defaultValue: false },
  requested_by: D.STRING(120), approved_by: D.STRING(120), approved_at: D.DATE,
  notes: D.TEXT,
}, { tableName: 'wt_project_disbursements' });

const WtProvider = sequelize.define('WtProvider', {
  ...base,
  code: { type: D.STRING(30), allowNull: false, unique: true },
  business_name: { type: D.STRING(200), allowNull: false },
  contact_person: D.STRING(120), specialty: D.STRING(160),
  approved_services: D.JSON,
  status: { type: D.STRING(30), defaultValue: 'Pending' },
  onboarded_since: D.STRING(40),
  completion_rate: { type: D.DECIMAL(5, 2), defaultValue: 0 },
  rating: { type: D.DECIMAL(2, 1), defaultValue: 0 },
  complaint_rate: { type: D.DECIMAL(5, 2), defaultValue: 0 },
  jobs_completed: { type: D.INTEGER, defaultValue: 0 },
  coverage: D.STRING(255), compliance: D.JSON, rank: D.INTEGER, notes: D.TEXT,
  // ── SSPC-WTCM-SOP-02 (Third-Party Service Provider Management) ──
  // Sec. 5 Step 1 business profile
  application_date: D.DATEONLY, legal_name: D.STRING(200), business_type: D.STRING(80),
  registration_no: D.STRING(80), years_experience: { type: D.INTEGER, defaultValue: 0 },
  team_size: { type: D.INTEGER, defaultValue: 0 }, equipment_summary: D.TEXT,
  address: D.STRING(255), district: D.STRING(80),
  contact_email: D.STRING(160), contact_phone: D.STRING(40), website: D.STRING(160),
  service_categories: D.JSON, coverage_areas: D.JSON,
  capacity_per_week: { type: D.INTEGER, defaultValue: 0 },
  // Sec. 4 workflow position
  onboarding_stage: { type: D.STRING(40), defaultValue: 'Application' },
  stage_updated_at: D.DATE,
  approved_date: D.DATEONLY, approved_by: D.STRING(120),
  suspended_date: D.DATEONLY, suspension_reason: D.TEXT,
  terminated_date: D.DATEONLY, termination_reason: D.TEXT,
  // Sec. 5 Step 1 capability assessment
  capability_score: { type: D.INTEGER, defaultValue: 0 }, capability_notes: D.TEXT,
  assessed_by: D.STRING(120), assessed_date: D.DATEONLY,
  // Sec. 6 Step 4 master agreement
  agreement_status: { type: D.STRING(40), defaultValue: 'Not Started' },
  agreement_envelope_id: D.INTEGER, agreement_code: D.STRING(40),
  agreement_signed_date: D.DATEONLY, agreement_expiry_date: D.DATEONLY,
  active_agreement_id: D.INTEGER,
  onboarding_token_hash: D.STRING(128), onboarding_token_expires_at: D.DATE,
  // Portal access (0084) — separate from onboarding: that expires when the
  // application completes, this outlives it.
  portal_token_hash: D.STRING(128), portal_token_expires_at: D.DATE,
  portal_last_seen_at: D.DATE, portal_revoked_at: D.DATE,
  portal_user_id: D.INTEGER,
  onboarding_submission_status: { type: D.STRING(30), defaultValue: 'Staff Draft' },
  onboarding_last_step: { type: D.INTEGER, defaultValue: 0 },
  bank_details: D.JSON, proposed_rates: D.JSON, payment_verified: { type: D.BOOLEAN, defaultValue: false },
  availability_notes: D.TEXT,
  // Sec. 6 Step 5 + Sec. 11 Cumilla territory
  cumilla_briefed: { type: D.BOOLEAN, defaultValue: false }, cumilla_briefing_date: D.DATEONLY,
  cumilla_acknowledged_by: D.STRING(120), cumilla_exclusive: { type: D.BOOLEAN, defaultValue: false },
  territory_breaches: { type: D.INTEGER, defaultValue: 0 },
  // Sec. 12 non-circumvention
  circumvention_breaches: { type: D.INTEGER, defaultValue: 0 },
  // Sec. 16 KPI measures
  response_time_hours: { type: D.DECIMAL(6, 1), defaultValue: 0 },
  warranty_claim_rate: { type: D.DECIMAL(5, 2), defaultValue: 0 },
  satisfaction_score: { type: D.DECIMAL(3, 1), defaultValue: 0 },
  revenue_generated: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  repeat_project_rate: { type: D.DECIMAL(5, 2), defaultValue: 0 },
  // Sec. 14/Sec. 15 audits and renewal
  last_audit_date: D.DATEONLY, next_audit_date: D.DATEONLY,
  renewal_decision: D.STRING(40), renewal_date: D.DATEONLY, next_renewal_date: D.DATEONLY,
}, { tableName: 'wt_providers' });

const WtAmcContract = sequelize.define('WtAmcContract', {
  ...base,
  code: { type: D.STRING(30), allowNull: false, unique: true },
  client_name: { type: D.STRING(200), allowNull: false },
  package: D.STRING(120), frequency: { type: D.STRING(40), defaultValue: 'Quarterly' },
  start_date: D.DATEONLY, end_date: D.DATEONLY, next_visit: D.STRING(40),
  annual_value: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  status: { type: D.STRING(30), defaultValue: 'Active' },
  // ── SOP-01 §10 + Customer Service Agreement Clauses 2 & 9 (migration 0079) ──
  client_code: D.STRING(30), client_id: D.INTEGER,
  client_type: { type: D.STRING(30), defaultValue: 'Residential' },
  contact_person: D.STRING(120), phone: D.STRING(40), email: D.STRING(160),
  property_id: D.INTEGER, property_code: D.STRING(40),
  site_address: D.STRING(255), area: D.STRING(120), district: D.STRING(80),
  site_contact_name: D.STRING(120), site_contact_phone: D.STRING(40), access_notes: D.TEXT,
  tank_type: D.STRING(120), tanks_count: { type: D.INTEGER, defaultValue: 0 },
  tank_capacity: D.STRING(120), water_source: D.STRING(120),
  package_tier: D.STRING(80), included_services: D.JSON,
  inclusions: D.TEXT, exclusions: D.TEXT,
  duration_months: { type: D.INTEGER, defaultValue: 12 },
  auto_renew: { type: D.BOOLEAN, defaultValue: false },
  renewal_notice_days: { type: D.INTEGER, defaultValue: 30 },
  renewed_from: D.STRING(30), renewed_to: D.STRING(30),
  renewal_decision: D.STRING(30), renewal_due_at: D.DATEONLY,
  visits_per_year: { type: D.INTEGER, defaultValue: 4 }, visit_types: D.JSON,
  first_visit_date: D.DATEONLY, last_visit_date: D.DATEONLY,
  visits_completed: { type: D.INTEGER, defaultValue: 0 },
  visits_planned: { type: D.INTEGER, defaultValue: 0 },
  payment_frequency: { type: D.STRING(30), defaultValue: 'Annually' },
  instalment_amount: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  advance_amount: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  per_visit_value: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  vat_percent: { type: D.DECIMAL(5, 2), defaultValue: 0 },
  discount: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  contract_value: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  billed_to_date: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  collected_to_date: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  payment_terms: D.STRING(200),
  response_hours: { type: D.INTEGER, defaultValue: 24 },
  emergency_included: { type: D.BOOLEAN, defaultValue: false },
  emergency_callouts_included: { type: D.INTEGER, defaultValue: 0 },
  water_testing_included: { type: D.BOOLEAN, defaultValue: false },
  reports_included: { type: D.BOOLEAN, defaultValue: true },
  agreement_code: D.STRING(40), agreement_envelope_id: D.INTEGER,
  agreement_status: { type: D.STRING(30), defaultValue: 'Not Started' },
  project_code: D.STRING(30), quotation_code: D.STRING(30),
  provider_code: D.STRING(30), provider_id: D.INTEGER, provider_name: D.STRING(160),
  assigned_officer: D.STRING(120),
  satisfaction_score: D.INTEGER, timeline: D.JSON, notes: D.TEXT,
  cancelled_at: D.DATE, cancel_reason: D.TEXT,
}, { tableName: 'wt_amc_contracts' });

/* One planned AMC visit. The schedule IS the contract — the client is buying N
   visits a year, so each is its own row with a due date and a completion. */
const WtAmcVisit = sequelize.define('WtAmcVisit', {
  ...base,
  code: { type: D.STRING(30), allowNull: false, unique: true },
  amc_code: { type: D.STRING(30), allowNull: false },
  client_name: D.STRING(200),
  visit_no: { type: D.INTEGER, defaultValue: 1 },
  visit_type: { type: D.STRING(60), allowNull: false, defaultValue: 'Cleaning' },
  due_date: D.DATEONLY, scheduled_date: D.DATEONLY, completed_date: D.DATEONLY,
  status: { type: D.STRING(30), defaultValue: 'Planned' },
  provider_name: D.STRING(160), work_order_code: D.STRING(30), assessment_code: D.STRING(30),
  report_url: D.STRING(500), findings: D.TEXT, water_test_result: D.STRING(120),
  photos: D.JSON,
  client_signed_off: { type: D.BOOLEAN, defaultValue: false },
  satisfaction_score: D.INTEGER, notes: D.TEXT,
}, { tableName: 'wt_amc_visits' });

const WtInvoice = sequelize.define('WtInvoice', {
  ...base,
  code: { type: D.STRING(30), allowNull: false, unique: true },
  project_id: D.STRING(30),
  client_name: { type: D.STRING(200), allowNull: false },
  inv_type: D.STRING(60),
  amount: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  due_date: D.DATEONLY,
  outstanding: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  status: { type: D.STRING(30), defaultValue: 'Draft' },
  provider_payout: { type: D.STRING(30), defaultValue: 'Not Due' },
  paid_amount: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  payments: D.JSON,
  // ── itemised invoicing (migration 0080) ──
  lines: D.JSON,
  subtotal: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  discount: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  discount_note: D.STRING(200),
  transport: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  govt_fees: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  other_charges: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  vat_percent: { type: D.DECIMAL(5, 2), defaultValue: 0 },
  vat_amount: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  advance_applied: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  advance_note: D.STRING(200),
  issue_date: D.DATEONLY,
  sent_at: D.DATE, viewed_at: D.DATE, paid_at: D.DATE,
  voided_at: D.DATE, void_reason: D.TEXT,
  sent_to: D.STRING(160), sent_by: D.STRING(120),
  client_code: D.STRING(30), client_id: D.INTEGER,
  bill_to_name: D.STRING(200), bill_to_address: D.STRING(255),
  bill_to_phone: D.STRING(40), bill_to_email: D.STRING(160),
  site_address: D.STRING(255),
  source_type: { type: D.STRING(40), defaultValue: 'Manual' },
  agreement_code: D.STRING(40), agreement_envelope_id: D.INTEGER,
  amc_code: D.STRING(30), quotation_code: D.STRING(30), work_order_code: D.STRING(30),
  instalment_no: D.INTEGER, instalment_of: D.INTEGER,
  period_start: D.DATEONLY, period_end: D.DATEONLY,
  currency: { type: D.STRING(8), defaultValue: 'BDT' },
  payment_terms: D.STRING(255), notes: D.TEXT, footer_note: D.TEXT,
  reference: D.STRING(80), prepared_by: D.STRING(120),
  document_html: D.TEXT('long'), issued_snapshot: D.JSON,
}, { tableName: 'wt_invoices' });

const WtComplaint = sequelize.define('WtComplaint', {
  ...base,
  code: { type: D.STRING(30), allowNull: false, unique: true },
  client_name: { type: D.STRING(200), allowNull: false },
  incident_type: D.STRING(160),
  severity: { type: D.STRING(20), defaultValue: 'Medium' },
  sla_due: D.STRING(60),
  status: { type: D.STRING(30), defaultValue: 'Open' },
  disclosure: D.TEXT, timeline: D.JSON, source_ref: D.STRING(80),
  resolution_hours: { type: D.DECIMAL(6, 1), defaultValue: 0 },
  logged_date: D.DATEONLY, resolved_date: D.DATEONLY,
  // Sec. 11 — acknowledge within 1 business day
  acknowledged_at: D.DATE, acknowledged_by: D.STRING(120), ack_due_at: D.DATE,
}, { tableName: 'wt_complaints' });

const WtWarranty = sequelize.define('WtWarranty', {
  ...base,
  code: { type: D.STRING(30), allowNull: false, unique: true },
  client_name: { type: D.STRING(200), allowNull: false },
  project_id: D.STRING(30), work_order_code: D.STRING(30),
  warranty_type: D.STRING(120), coverage: D.TEXT,
  start_date: D.DATEONLY, expiry_date: D.DATEONLY,
  status: { type: D.STRING(30), defaultValue: 'Active' },
  provider_name: D.STRING(160), terms: D.TEXT, claim_notes: D.TEXT, source_ref: D.STRING(80),
}, { tableName: 'wt_warranties' });

const WtIncident = sequelize.define('WtIncident', {
  ...base,
  code: { type: D.STRING(30), allowNull: false, unique: true },
  client_name: D.STRING(200), project_id: D.STRING(30), work_order_code: D.STRING(30),
  incident_type: { type: D.STRING(60), defaultValue: 'Other' },
  severity: { type: D.STRING(20), defaultValue: 'Medium' },
  incident_date: D.DATEONLY, location: D.STRING(200),
  provider_name: D.STRING(160), reported_by: D.STRING(120),
  description: D.TEXT, action_taken: D.TEXT, source_ref: D.STRING(80),
  status: { type: D.STRING(30), defaultValue: 'Open' },
}, { tableName: 'wt_incidents' });

/* SOP-01 client lifecycle timeline. */
const WtClientEvent = sequelize.define('WtClientEvent', {
  ...base,
  client_id: { type: D.INTEGER, allowNull: false },
  event_type: { type: D.STRING(60), allowNull: false },
  title: { type: D.STRING(200), allowNull: false },
  detail: D.TEXT, actor: D.STRING(120),
  occurred_at: { type: D.DATE, allowNull: false, defaultValue: D.NOW },
}, { tableName: 'wt_client_events' });

const WtCommLog = sequelize.define('WtCommLog', {
  ...base,
  client_name: { type: D.STRING(200), allowNull: false },
  channel: { type: D.STRING(20), defaultValue: 'call' },
  direction: { type: D.STRING(20), defaultValue: 'outbound' },
  summary: D.TEXT, ref_type: D.STRING(40), ref_code: D.STRING(30), logged_at: D.DATE,
}, { tableName: 'wt_comm_logs' });

/*
 * The money ledger (migration 0082). Append-only: a correction is a new row with
 * a negative amount pointing at what it reverses, never an edit. `timestamps` is
 * off apart from created_at for exactly that reason — there is nothing to update.
 */
const WtMoneyEvent = sequelize.define('WtMoneyEvent', {
  ...base,
  event_type: { type: D.STRING(40), allowNull: false },
  direction: { type: D.STRING(4), allowNull: false },
  subject_type: { type: D.STRING(20), allowNull: false },
  subject_id: { type: D.INTEGER, allowNull: false },
  subject_code: D.STRING(30),
  amount: { type: D.DECIMAL(15, 2), allowNull: false },
  currency: { type: D.STRING(8), defaultValue: 'BDT' },
  method: D.STRING(40),
  reference: D.STRING(120),
  received_on: D.DATEONLY,
  idempotency_key: { type: D.STRING(120), allowNull: false },
  reverses_event_id: D.INTEGER,
  reversal_reason: D.STRING(255),
  project_id: D.STRING(30),
  client_name: D.STRING(200),
  provider_name: D.STRING(160),
  note: D.TEXT,
  origin: { type: D.STRING(40), defaultValue: 'api' },
  actor: D.STRING(120),
  actor_id: D.INTEGER,
  created_at: { type: D.DATE, defaultValue: D.NOW },
}, { tableName: 'wt_money_events', timestamps: false });

module.exports = {
  WtClient, WtServiceRequest, WtSiteAssessment, WtQuotation, WtWorkOrder,
  WtProject, WtProvider, WtAmcContract, WtInvoice, WtComplaint, WtCommLog,
  WtWarranty, WtIncident, WtClientEvent, WtRecordComment, WtEnquiry,
  WtProjectDisbursement, WtAmcVisit, WtMoneyEvent,
};
