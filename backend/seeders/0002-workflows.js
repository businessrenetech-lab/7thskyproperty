'use strict';

/**
 * 0002 — CRM workflows & registers, derived from the "Docs For Follow" workbooks.
 * Each vertical gets: workflow_templates (ordered stages w/ checklists) and
 * register_definitions (one per workbook register sheet). Idempotent.
 *
 * Sources: Seventh_Sky_*_CRM_Detailed / *_Workflow_Checklists workbooks.
 */
// Single source of truth for the leasing (rental & tenancy) 18-stage SOP workflow.
const { STAGES: LEASING_STAGES } = require('../scripts/seed_leasing_workflow');

const GENERIC_COLUMNS = [
  { key: 'reference', label: 'Reference', type: 'text' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'text' },
  { key: 'assigned_to', label: 'Assigned To', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

// vertical_key -> { template name, stages[{name, checklist[]}], registers[] }
const DATA = {
  leasing: {
    template: 'Residential Rental & Tenancy Management',
    // 18-stage SOP workflow with rich checklist items (label/responsible/evidence/output).
    stages: LEASING_STAGES,
    registers: ['Owner Master Register', 'Property Master Register', 'Tenant Application Register', 'Tenant Approval Register', 'Lease Register', 'Rent Collection Register', 'Owner Disbursement Register', 'Arrears Tracker', 'Bond & Deposit Register', 'Inspection Register', 'Maintenance Register', 'Tenant Request Register', 'Utility & Bills Register', 'Occupant & Subletting Register', 'Non-Circumvention Register', 'Renewal Register', 'Termination & Vacancy', 'Risk Register'],
  },
  properties: {
    template: 'Residential Property Purchase',
    stages: [
      { name: 'Consultation', checklist: ['Buyer requirement captured', 'Budget & financing discussed'] },
      { name: 'Agreement & Engagement', checklist: ['Engagement agreement signed', 'Protected introduction recorded'] },
      { name: 'Property Sourcing', checklist: ['Sourcing tracker updated', 'Shortlist prepared'] },
      { name: 'Shortlisting & Inspection', checklist: ['Inspections scheduled', 'Inspection checklist completed'] },
      { name: 'Document Verification', checklist: ['Deed verified', 'Mutation checked', 'Professional advice obtained'] },
      { name: 'Negotiation', checklist: ['Negotiation tracker updated', 'Risk assessment done'] },
      { name: 'Offer & Approval', checklist: ['Offer approval checklist', 'Offer accepted'] },
      { name: 'Transaction Coordination', checklist: ['Transaction coordination tasks', 'Parties aligned'] },
      { name: 'Settlement & Registration', checklist: ['Settlement completed', 'Registration done', 'Fees & commission recorded'] },
      { name: 'Post-Purchase & Closure', checklist: ['Post purchase services', 'Project closure checklist'] },
    ],
    registers: ['Buyer Master Register', 'Buyer Requirement Form', 'Agreement & Engagement Register', 'Property Sourcing Tracker', 'Property Shortlist & Compare', 'Inspection Schedule', 'Document Verification Register', 'Professional Advice Tracker', 'Risk Assessment Register', 'Protected Introduction Register', 'Negotiation Tracker', 'Offer Approval Checklist', 'Transaction Coordination', 'Settlement & Registration', 'Fees & Commission Register', 'Project Register', 'Post Purchase Services'],
  },
  property_care: {
    template: 'Property Care & Concierge (MAPS)',
    stages: [
      { name: 'Enquiry', checklist: ['Service request logged', 'Client master created'] },
      { name: 'Consultation', checklist: ['Client consultation', 'Scope agreed'] },
      { name: 'Agreement', checklist: ['Service agreement signed', 'Insurance verified'] },
      { name: 'Vendor Allocation', checklist: ['Vendor selected', 'PSPA signed', 'Non-circumvention recorded'] },
      { name: 'Work Order', checklist: ['Work order issued', 'Project allocation'] },
      { name: 'Service Delivery', checklist: ['Service delivered', 'Variations recorded', 'Defects logged'] },
      { name: 'Evidence & Photos', checklist: ['Before/after photos', 'Evidence register updated'] },
      { name: 'Handover', checklist: ['Handover completed', 'Client payments recorded'] },
      { name: 'Feedback & Closure', checklist: ['Client satisfaction captured', 'Performance evaluation', 'Closure'] },
    ],
    registers: ['Client Master Register', 'Service Request Register', 'Client Consultation', 'Agreement Register', 'Client Payments', 'Insurance Register', 'Service Delivery', 'Variation Register', 'Risk Register', 'Complaint Register', 'Photo Register', 'Handover Register', 'Client Satisfaction', 'Vendor Register', 'PSPA Register', 'Work Order Register', 'Project Allocation', 'Evidence Register', 'Vendor Invoices', 'Non Circumvention', 'Defect Register', 'Performance Evaluation'],
  },
  water_tank: {
    template: 'Water Tank Cleaning & Maintenance',
    stages: [
      { name: 'Lead', checklist: ['Client master created', 'Needs assessment'] },
      { name: 'Consultation', checklist: ['Tank/facility details captured'] },
      { name: 'Site Assessment', checklist: ['Site assessment completed', 'Water quality reviewed'] },
      { name: 'Quotation', checklist: ['Quotation issued'] },
      { name: 'Agreement', checklist: ['Customer agreement signed'] },
      { name: 'Provider Assignment', checklist: ['Provider compliance verified', 'Provider assigned', 'Cumilla exclusivity checked'] },
      { name: 'Work Order', checklist: ['Work order issued'] },
      { name: 'Service Delivery', checklist: ['Service delivery checklist', 'Repairs / pump & pipeline'] },
      { name: 'Report & Invoice', checklist: ['Service report', 'Invoice & payment'] },
      { name: 'AMC / Warranty & Closure', checklist: ['AMC scheduled', 'Warranty recorded', 'Closure'] },
    ],
    registers: ['Client Master Register', 'Client Needs Assessment', 'Service Request Register', 'Facility & Tank Register', 'Site Assessment Register', 'Quotation Register', 'Customer Agreement Register', 'Work Order Register', 'Project Register', 'Water Quality Register', 'Repair Register', 'Pump & Pipeline Register', 'AMC Register', 'Invoice & Payment Register', 'Warranty Register', 'Complaint Register', 'Incident Register', 'Provider Master Register', 'Provider Compliance Register', 'Protected Client Register', 'Risk Register'],
  },
  solar: {
    template: 'Solar & Energy Solutions',
    stages: [
      { name: 'Lead & Needs Assessment', checklist: ['Client master', 'Needs & energy usage assessment'] },
      { name: 'Site Assessment', checklist: ['Property & site register', 'Solar site assessment'] },
      { name: 'Technical Proposal', checklist: ['Technical proposal prepared'] },
      { name: 'Quotation & Agreement', checklist: ['Quotation issued', 'Customer agreement signed'] },
      { name: 'Deposit & Approval', checklist: ['Deposit collected', 'Approval recorded'] },
      { name: 'Procurement & Installation', checklist: ['Procurement', 'Installation project', 'Battery & backup'] },
      { name: 'Testing & Commissioning', checklist: ['Testing & commissioning', 'Performance monitoring setup'] },
      { name: 'Warranty & Closure', checklist: ['Warranty recorded', 'Project closure'] },
    ],
    registers: ['Client Master Register', 'Client Needs Assessment', 'Service Request Register', 'Energy Usage Register', 'Property & Site Register', 'Solar Site Assessment', 'Technical Proposal Register', 'Quotation Register', 'Customer Agreement Register', 'Deposit & Approval Register', 'Work Order Register', 'Procurement Register', 'Installation Project Register', 'Testing & Commissioning', 'Battery & Backup Register', 'Maintenance Register', 'Performance Monitoring', 'Warranty Register', 'Invoice & Payment Register', 'Provider Master Register', 'Provider Compliance Register', 'Protected Client Register', 'Risk Register'],
  },
  ac: {
    template: 'Air Conditioning Solutions',
    stages: [
      { name: 'Lead & Service Request', checklist: ['Client master', 'Service request logged'] },
      { name: 'Site Assessment', checklist: ['Site assessment completed'] },
      { name: 'Quotation & Agreement', checklist: ['Quotation issued', 'Customer agreement signed'] },
      { name: 'Provider Assignment', checklist: ['Provider compliance & insurance', 'Provider assigned', 'Cumilla exclusivity checked'] },
      { name: 'Work Order & Installation', checklist: ['Work order issued', 'Installation project'] },
      { name: 'Maintenance / Repair', checklist: ['Maintenance', 'Repair', 'Refrigerant handling'] },
      { name: 'AMC & Warranty', checklist: ['AMC scheduled', 'Warranty recorded'] },
      { name: 'Invoice & Closure', checklist: ['Invoice & payment', 'Closure'] },
    ],
    registers: ['Client Master Register', 'Service Request Register', 'Site Assessment Register', 'Quotation Register', 'Customer Agreement Register', 'Installation Project Register', 'Maintenance Register', 'Repair Register', 'Refrigerant Register', 'AMC Register', 'Warranty Register', 'Invoice & Payment Register', 'Complaint & Incident Register', 'Provider Master Register', 'Provider Compliance Register', 'Provider Insurance Register', 'Cumilla Exclusivity Register', 'Work Order Register'],
  },
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const seq = queryInterface.sequelize;
    for (const [vertical_key, cfg] of Object.entries(DATA)) {
      // Idempotent reset for this vertical
      await seq.query('DELETE FROM workflow_templates WHERE vertical_key = :v', { replacements: { v: vertical_key } });
      await seq.query('DELETE FROM register_definitions WHERE vertical_key = :v', { replacements: { v: vertical_key } });

      const stages = cfg.stages.map((s, i) => ({
        key: slug(s.name), name: s.name, order: i + 1, gate: true,
        // Checklist items may be plain strings (legacy verticals) or rich objects
        // ({label, required, responsible, evidence_required, output}).
        checklist: (s.checklist || []).map((c) => (typeof c === 'string' ? { label: c, required: true } : c)),
        required_docs: s.required_docs || [],
      }));
      await queryInterface.bulkInsert('workflow_templates', [{
        vertical_key, name: cfg.template, stages: JSON.stringify(stages), is_active: true, created_at: now, updated_at: now,
      }]);

      await queryInterface.bulkInsert('register_definitions', cfg.registers.map((name, i) => ({
        vertical_key, register_key: slug(name), name,
        columns: JSON.stringify(GENERIC_COLUMNS), sort_order: i, is_active: true, created_at: now, updated_at: now,
      })));
    }
  },

  async down(queryInterface) {
    const keys = Object.keys(DATA);
    for (const v of keys) {
      await queryInterface.bulkDelete('workflow_templates', { vertical_key: v });
      await queryInterface.bulkDelete('register_definitions', { vertical_key: v });
    }
  },
};
