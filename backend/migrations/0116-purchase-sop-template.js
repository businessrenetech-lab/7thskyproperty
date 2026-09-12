'use strict';
// Residential Purchase SOP — the buyer-service 8-stage workflow template
// (vertical_key 'residential_purchase'), plus a property_deal_id column on
// projects so a buyer SOP Project can be keyed to its buy PropertyDeal.
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// Purchase SOP V0.1, stages 1-8 → gated workflow stages with checklists.
const PURCHASE_STAGES = [
  ['Enquiry & Consultation', ['Buyer/profile/source captured', 'Consultation recorded', 'Fees explained', 'Phase-1 quotation + RPPS agreement issued']],
  ['Requirement Assessment & Planning', ['Finance readiness assessed', 'Investment suitability', 'Property-preference checklist', 'Risk notes', 'Search strategy', 'Approval to proceed to active search']],
  ['Property Search & Shortlisting', ['Suitable properties identified', 'Shortlist shared with buyer', 'Buyer feedback recorded']],
  ['Inspection Coordination', ['Viewings scheduled', 'Inspection notes / photos', 'Buyer inspection feedback']],
  ['Documentation Review & Risk', ['Seller documents collected', 'Ownership / mutation / conveyancing coordination', 'Risk flags recorded', 'Buyer acknowledgement (disclaimer)']],
  ['Negotiation & Offer Coordination', ['Offers coordinated', 'Negotiation history', 'Buyer approvals', 'Counter-offers tracked']],
  ['Agreement & Settlement Coordination', ['Agreement executed', 'Registration status', 'External settlement milestones', 'Payment tracking', 'Fee collection', 'Handover readiness']],
  ['Closure & Post-Purchase Follow-Up', ['Final reports / archive', 'Buyer feedback', 'Financial closure (all fees collected)', 'Workflow closed']],
];

module.exports = {
  up: async (q, S) => {
    // 1) projects.property_deal_id (additive, guarded)
    const cols = await q.describeTable('projects').catch(() => ({}));
    if (!cols.property_deal_id) {
      await q.addColumn('projects', 'property_deal_id', { type: S.INTEGER, allowNull: true });
      await q.addIndex('projects', ['property_deal_id']);
    }
    // 2) workflow template
    const now = new Date();
    const stages = PURCHASE_STAGES.map(([name, items], i) => ({
      key: slug(name), name, order: i + 1, gate: true,
      checklist: items.map((label) => ({ label, required: true })),
      required_docs: [],
    }));
    await q.sequelize.query('DELETE FROM workflow_templates WHERE vertical_key = :v', { replacements: { v: 'residential_purchase' } });
    await q.bulkInsert('workflow_templates', [{
      vertical_key: 'residential_purchase', name: 'Residential Purchase SOP',
      stages: JSON.stringify(stages), is_active: true, created_at: now, updated_at: now,
    }]);
  },
  down: async (q) => {
    await q.sequelize.query("DELETE FROM workflow_templates WHERE vertical_key = 'residential_purchase'").catch(() => {});
    await q.removeColumn('projects', 'property_deal_id').catch(() => {});
  },
};
