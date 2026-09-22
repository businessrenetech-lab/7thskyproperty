'use strict';

/**
 * Migration 0145: workflow templates for Business Sale (14 workbook stages,
 * Business_Sale_Workflow_and_Checklists V0.1 sheet 2) and Business Purchase
 * (Business Purchase SOP V0.1 phases). Inserts only when the vertical has no
 * template yet — never overwrites edits.
 */
// Same register columns as seeders/0002-workflows.js.
const GENERIC_COLUMNS = [
  { key: 'reference', label: 'Reference', type: 'text' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'text' },
  { key: 'assigned_to', label: 'Assigned To', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const DATA = {
  business_sale: {
    template: 'Business Sale SOP',
    stages: [
      ['Lead Intake', ['Business sale enquiry received and CRM profile created', 'Identity verification']],
      ['Consultation', ['Seller / business owner details collected', 'Business operational details collected', 'Reason for sale discussed', 'Expected business value assessed']],
      ['Assessment', ['Preliminary business assessment completed', 'Preliminary risks identified', 'Operational risk review']],
      ['Documentation', ['Trade licence & company registration collected', 'Tax & financial records collected', 'Lease agreements & liabilities reviewed', 'Compliance review']],
      ['Preparation', ['Business presentation improvement coordinated', 'Photography & marketing materials coordinated', 'Safety & operational review']],
      ['Marketing', ['Business listing prepared', 'Business advertisements published', 'Advertising compliance checked']],
      ['Lead Management', ['Buyer enquiries tracked', 'Buyer leads qualified', 'Fraud screening']],
      ['Inspection', ['Preliminary buyer screening done', 'Confidentiality (NDA) in place before disclosure', 'Buyer meetings & inspections coordinated', 'Inspection reports recorded']],
      ['Negotiation', ['Offers & counteroffers recorded', 'Negotiation coordinated', 'Commission protection monitored']],
      ['Due Diligence', ['Due diligence coordinated', 'Legal & financial review', 'Compliance risks escalated']],
      ['Agreement', ['Sale agreement prepared', 'Signed agreement received', 'Legal review']],
      ['Settlement', ['Ownership transfer supported', 'Settlement documents collected', 'Financial verification']],
      ['Financial', ['Commission & operational fees collected', 'Payment receipts recorded']],
      ['Closure', ['Final report issued', 'Transaction records archived', 'CRM workflow closed']],
    ],
    registers: ['Seller Profile', 'Business Profile', 'Business Documents', 'Assessment Report', 'Preparation Checklist', 'Buyer Lead Register', 'Buyer Screening Notes', 'Inspection Schedule', 'Offer Register', 'Due Diligence Tracker', 'Settlement Record', 'Commission Record', 'Non-Circumvention Register'],
  },
  business_purchase: {
    template: 'Business Purchase SOP',
    stages: [
      ['Buyer Engagement', ['Buyer details & investment goals collected', 'Acquisition suitability assessed', 'Acquisition plan discussed', 'Purchase service agreement signed', 'CRM set up']],
      ['Business Search & Sourcing', ['Business search activated', 'Preliminary business screening', 'Shortlist with investment summaries prepared']],
      ['Inspection', ['Inspections & seller meetings coordinated', 'Inspection records kept', 'Confidentiality (NDA) in place before disclosure']],
      ['Negotiation', ['Acquisition offers coordinated', 'Seller communication coordinated', 'Non-circumvention monitored']],
      ['Due Diligence & Verification', ['Financial, operational, lease, supplier, licence, employee & tax review', 'Professionals coordinated', 'Compliance risks escalated']],
      ['Agreement & Settlement', ['Acquisition agreement coordinated', 'Deposits, fees, commission & expenses tracked', 'Settlement & handover coordinated']],
      ['Post-Settlement', ['Acquisition & settlement summary issued', 'CRM closed', 'Records archived']],
    ],
    registers: ['Buyer Profile', 'Acquisition Requirement Profile', 'Business Search Records', 'Business Shortlist', 'Inspection Records', 'Offer Register', 'Due Diligence Records', 'Settlement Records', 'Non-Circumvention Register'],
  },
};

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const seq = queryInterface.sequelize;
    for (const [vertical_key, cfg] of Object.entries(DATA)) {
      const [have] = await seq.query('SELECT COUNT(*) AS n FROM workflow_templates WHERE vertical_key = :v', { replacements: { v: vertical_key } });
      if (Number(have[0].n) > 0) continue;
      const stages = cfg.stages.map(([name, checklist], i) => ({
        key: slug(name), name, order: i + 1, gate: true,
        checklist: checklist.map((label) => ({ label, required: true })), required_docs: [],
      }));
      await queryInterface.bulkInsert('workflow_templates', [{ vertical_key, name: cfg.template, stages: JSON.stringify(stages), is_active: true, created_at: now, updated_at: now }]);
      await queryInterface.bulkInsert('register_definitions', cfg.registers.map((name, i) => ({
        vertical_key, register_key: slug(name), name, columns: JSON.stringify(GENERIC_COLUMNS), sort_order: i, is_active: true, created_at: now, updated_at: now,
      })));
    }
  },
  down: async (queryInterface) => {
    for (const v of Object.keys(DATA)) {
      await queryInterface.bulkDelete('workflow_templates', { vertical_key: v });
      await queryInterface.bulkDelete('register_definitions', { vertical_key: v });
    }
  },
};
