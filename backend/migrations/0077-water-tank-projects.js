'use strict';

/**
 * Migration 0077: Water Tank — the Project file.
 *
 * Migration 0065 created wt_projects as a thin label (name, client, stage) because
 * the Figma frame only ever showed a summary card. The project is actually the
 * spine of SSPC-WTCM-SOP-01: every other record in the module — the enquiry, the
 * service request, the assessment, the quotation, the agreement, the work order,
 * the invoices, the warranty, the AMC visits — hangs off one project. This
 * migration gives it the columns to hold those links and the eleven-stage
 * lifecycle the SOP actually describes (Sec. 4 Client Management Workflow), plus
 * the closure evidence Sec. 12 requires.
 *
 * It also adds wt_project_disbursements: the money that flows OUT of a project.
 * Provider payouts already live on wt_work_orders (migration 0066) and are read
 * from there — this table is for everything else Seventh Sky spends on a job
 * (materials, transport, lab testing, government fees, reimbursements) so the
 * project's Billing tab can show the complete cash picture rather than half of it.
 *
 * Idempotent: safe to re-run.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const has = async (t) => { try { await queryInterface.describeTable(t); return true; } catch { return false; } };
    const hasCol = async (t, c) => { try { return !!(await queryInterface.describeTable(t))[c]; } catch { return false; } };
    const add = async (t, c, spec) => { if (!(await hasCol(t, c))) await queryInterface.addColumn(t, c, spec); };
    const ts = () => ({
      createdAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });

    // ────────────────────────────────────────────────────────────────────
    // wt_projects — the full project file
    // ────────────────────────────────────────────────────────────────────
    const cols = {
      // ── who: the client (SOP Sec. 5 Step 1) ──
      client_code: S.STRING(30),
      client_id: S.INTEGER,
      client_type: { type: S.STRING(30), defaultValue: 'Residential' },
      client_phone: S.STRING(40),
      client_email: S.STRING(160),
      // the signed Customer Service Agreement gating commencement (Sec. 7 Step 6)
      agreement_code: S.STRING(40),
      agreement_envelope_id: S.INTEGER,
      agreement_status: { type: S.STRING(30), defaultValue: 'Not Started' },
      agreement_signed_at: S.DATE,

      // ── where: the site (assigned from the property register or captured here) ──
      property_id: S.INTEGER,
      property_code: S.STRING(40),
      property_title: S.STRING(200),
      property_type: S.STRING(80),
      site_address: S.STRING(255),
      area: S.STRING(120),
      city: S.STRING(80),
      district: S.STRING(80),
      site_contact_name: S.STRING(120),
      site_contact_phone: S.STRING(40),
      access_notes: S.TEXT,

      // ── what: the tanks and the scope ──
      project_type: { type: S.STRING(60), defaultValue: 'Cleaning & Maintenance' },
      service_category: S.STRING(80),
      services: S.JSON,          // [{ code, name, qty, price, group }]
      tank_type: S.STRING(120),
      tanks_count: { type: S.INTEGER, defaultValue: 0 },
      tank_capacity: S.STRING(120),
      water_source: S.STRING(120),
      scope_summary: S.TEXT,
      priority: { type: S.STRING(20), defaultValue: 'Medium' },

      // ── where it came from: the upstream chain (Sec. 5 → Sec. 7) ──
      origin: { type: S.STRING(40), defaultValue: 'Direct' }, // Enquiry | Service Request | Assessment | Quotation | AMC | Direct
      enquiry_code: S.STRING(30),
      request_code: S.STRING(30),
      assessment_code: S.STRING(30),
      quotation_code: S.STRING(30),
      work_order_code: S.STRING(30),
      // what the operator asked for at entry, so the console can chase it
      needs_assessment: { type: S.BOOLEAN, defaultValue: false },
      needs_quotation: { type: S.BOOLEAN, defaultValue: false },

      // ── AMC linkage (SOP Sec. 10) ──
      under_amc: { type: S.BOOLEAN, defaultValue: false },
      amc_code: S.STRING(30),
      amc_package: S.STRING(120),
      amc_frequency: S.STRING(40),
      amc_visit_no: S.INTEGER,
      amc_next_visit: S.DATEONLY,

      // ── delivery (Sec. 8) ──
      provider_code: S.STRING(30),
      provider_id: S.INTEGER,
      assigned_officer: S.STRING(120),
      ops_manager: S.STRING(120),
      scheduled_date: S.DATEONLY,
      actual_start: S.DATEONLY,
      actual_completion: S.DATEONLY,
      progress_pct: { type: S.INTEGER, defaultValue: 0 },
      duration_days: S.INTEGER,

      // ── commercials (Sec. 7 Step 5, Sec. 12) ──
      contract_value: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      provider_cost: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      deposit_required: { type: S.BOOLEAN, defaultValue: false },
      deposit_amount: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      deposit_received_at: S.DATEONLY,
      payment_terms: S.STRING(200),

      // ── closure & quality (Sec. 9, Sec. 12, Sec. 13 KPIs) ──
      handover_at: S.DATEONLY,
      warranty_code: S.STRING(30),
      warranty_period: S.STRING(60),
      satisfaction_score: S.INTEGER,
      closure_checklist: S.JSON,   // [{ key, label, done, at, by }]
      risk_flags: S.JSON,          // [{ label, severity, note }]
      closed_at: S.DATE,
      archived_at: S.DATE,
      cancel_reason: S.TEXT,
      notes: S.TEXT,
    };
    for (const [c, spec] of Object.entries(cols)) await add('wt_projects', c, spec);

    // Widen `stage` — the SOP workflow has eleven steps, not the seven the
    // original Figma stepper showed, and the labels are longer.
    try {
      await queryInterface.changeColumn('wt_projects', 'stage', {
        type: S.STRING(60), defaultValue: 'Lead Enquiry',
      });
    } catch { /* dialect refused the widen; STRING(40) still holds every label */ }

    for (const [name, fields] of Object.entries({
      wt_projects_client_code: ['client_code'],
      wt_projects_property_id: ['property_id'],
      wt_projects_stage: ['stage'],
      wt_projects_provider_code: ['provider_code'],
    })) {
      try { await queryInterface.addIndex('wt_projects', fields, { name }); } catch { /* exists */ }
    }

    // ────────────────────────────────────────────────────────────────────
    // wt_project_disbursements — money paid out on a project
    // ────────────────────────────────────────────────────────────────────
    if (!(await has('wt_project_disbursements'))) {
      await queryInterface.createTable('wt_project_disbursements', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        code: { type: S.STRING(30), allowNull: false, unique: true },
        project_code: { type: S.STRING(30), allowNull: false },
        // Provider Payout | Materials | Transport | Lab Testing | Government Fee
        // | Equipment Hire | Reimbursement | Other
        category: { type: S.STRING(60), allowNull: false, defaultValue: 'Other' },
        payee: S.STRING(200),
        payee_type: { type: S.STRING(40), defaultValue: 'Supplier' },
        work_order_code: S.STRING(30),
        description: S.TEXT,
        amount: { type: S.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        // Requested | Approved | Paid | Rejected
        status: { type: S.STRING(30), defaultValue: 'Requested' },
        incurred_on: S.DATEONLY,
        paid_on: S.DATEONLY,
        method: S.STRING(40),
        reference: S.STRING(80),
        receipt_url: S.STRING(500),
        billable_to_client: { type: S.BOOLEAN, defaultValue: false },
        requested_by: S.STRING(120),
        approved_by: S.STRING(120),
        approved_at: S.DATE,
        notes: S.TEXT,
        ...ts(),
      });
      try {
        await queryInterface.addIndex('wt_project_disbursements', ['project_code'], { name: 'wt_disb_project' });
      } catch { /* exists */ }
    }
  },

  down: async (queryInterface) => {
    const rm = async (t, c) => { try { await queryInterface.removeColumn(t, c); } catch { /* not present */ } };
    try { await queryInterface.dropTable('wt_project_disbursements'); } catch { /* not present */ }
    const cols = [
      'client_code', 'client_id', 'client_type', 'client_phone', 'client_email',
      'agreement_code', 'agreement_envelope_id', 'agreement_status', 'agreement_signed_at',
      'property_id', 'property_code', 'property_title', 'property_type', 'site_address',
      'area', 'city', 'district', 'site_contact_name', 'site_contact_phone', 'access_notes',
      'project_type', 'service_category', 'services', 'tank_type', 'tanks_count',
      'tank_capacity', 'water_source', 'scope_summary', 'priority',
      'origin', 'enquiry_code', 'request_code', 'assessment_code', 'quotation_code',
      'work_order_code', 'needs_assessment', 'needs_quotation',
      'under_amc', 'amc_code', 'amc_package', 'amc_frequency', 'amc_visit_no', 'amc_next_visit',
      'provider_code', 'provider_id', 'assigned_officer', 'ops_manager', 'scheduled_date',
      'actual_start', 'actual_completion', 'progress_pct', 'duration_days',
      'contract_value', 'provider_cost', 'deposit_required', 'deposit_amount',
      'deposit_received_at', 'payment_terms',
      'handover_at', 'warranty_code', 'warranty_period', 'satisfaction_score',
      'closure_checklist', 'risk_flags', 'closed_at', 'archived_at', 'cancel_reason', 'notes',
    ];
    for (const c of cols) await rm('wt_projects', c);
  },
};
